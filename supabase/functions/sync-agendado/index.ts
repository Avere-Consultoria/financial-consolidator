import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, exigirMaster, ehChamadaSistema } from '../_shared/auth.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: sync-agendado (orquestrador)
//
// Processa UM lote de contas pendentes de sincronização do dia e dispara, para
// cada uma, a edge function da instituição (get-*-position) em modo SISTEMA
// (header x-cron-secret). Reaproveita 100% da lógica de cada conector.
//
// Quem chama:
//   • o cron (pg_net) com header x-cron-secret  → origem 'cron'
//   • o master pela UI ("Rodar agora")          → JWT de master, body { force:true }
//
// Por que em lote: 470 contas × ~3s estouraria o limite (~150s) de uma function.
// O cron roda a cada 5 min na janela e vai drenando a fila (ultima_sync de hoje
// tira a conta da próxima rodada). Deploy: --no-verify-jwt (auth interna).
// ─────────────────────────────────────────────────────────────────────────────

const FN: Record<string, string> = {
  BTG: 'get-btg-position', XP: 'get-xp-position',
  AVENUE: 'get-avenue-position', AGORA: 'get-agora-position',
}

function inicioDoDiaSP(): number {
  // timestamp (ms) do início de hoje no fuso de São Paulo
  const agora = new Date()
  const sp = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  sp.setHours(0, 0, 0, 0)
  // corrige o offset entre o relógio local do runtime e SP
  const diff = agora.getTime() - new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getTime()
  return sp.getTime() + diff
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // ── Auth: sistema (cron) OU master (UI) ─────────────────────────────────────
  const sistema = await ehChamadaSistema(req)
  let force = false
  if (!sistema) {
    const authResult = await validarAuth(req)
    if ('error' in authResult) return authResult.error
    const masterErr = exigirMaster(authResult.ctx)
    if (masterErr) return masterErr
    force = true   // só o master dispara manual (ignora a janela)
  }

  const body = await req.json().catch(() => ({}))
  const origem = force ? 'manual' : (body?.origem ?? 'cron')
  const supabase = createServiceClient()
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

  // ── Config ──────────────────────────────────────────────────────────────────
  const { data: cfg } = await supabase.from('sync_config').select('*').eq('id', 1).maybeSingle()
  if (!cfg) return errorResponse('sync_config não encontrada', 500)
  if (!force && !cfg.habilitado) return jsonResponse({ skipped: 'desabilitado' })

  const instituicoes: string[] = cfg.instituicoes ?? ['BTG', 'AVENUE', 'AGORA']
  const lote: number = cfg.tamanho_lote ?? 25

  // ── Seleciona contas ativas das instituições, ainda não sincronizadas hoje ──
  const { data: contas, error } = await supabase
    .from('cliente_contas')
    .select('id, ultima_sync, instituicoes!inner(codigo)')
    .eq('ativo', true)
    .in('instituicoes.codigo', instituicoes)
  if (error) return errorResponse(`Erro ao listar contas: ${error.message}`, 500)

  const corte = inicioDoDiaSP()
  const pendentes = (contas ?? [])
    .filter((c: any) => !c.ultima_sync || new Date(c.ultima_sync).getTime() < corte)
    .sort((a: any, b: any) => {
      const ta = a.ultima_sync ? new Date(a.ultima_sync).getTime() : 0
      const tb = b.ultima_sync ? new Date(b.ultima_sync).getTime() : 0
      return ta - tb   // nulls/antigas primeiro
    })
    .slice(0, lote)

  // nada pendente: não polui o log (a não ser execução manual explícita)
  if (pendentes.length === 0) {
    return jsonResponse({ origem, total: 0, ok: 0, erro: 0, mensagem: 'fila vazia' })
  }

  // ── Dispara cada conta em modo sistema (sequencial; respeita rate limit) ────
  // Orçamento de tempo: a edge function tem teto (~150s). Só inicia uma conta se ela
  // couber em SAFE_LIMIT_MS contando o timeout dela; o resto fica na fila (o próximo
  // tique/clique pega). Cada chamada tem timeout próprio (XP maior) pra uma conta
  // travada não derrubar o lote.
  const baseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const apikey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const SAFE_LIMIT_MS = 140_000      // teto de wall-clock da edge (~150s) com margem
  const TIMEOUT_CONTA_MS = 30_000    // padrão: BTG/Ágora/Avenue respondem rápido
  const TIMEOUT_XP_MS = 90_000       // XP é assíncrona: cold-start segura a conexão até ~1 min
  const inicio = Date.now()
  let ok = 0, erro = 0, processados = 0
  const falhas: Array<{ contaId: string; inst: string; msg: string }> = []

  for (const c of pendentes) {
    const inst = (c as any).instituicoes?.codigo as string
    const fn = FN[inst]
    if (!fn) { erro++; falhas.push({ contaId: c.id, inst, msg: 'instituição sem function' }); continue }
    // Timeout por conta (XP precisa de mais no cold-start). Não inicia uma conta que
    // não caiba no teto da edge → resto fica na fila (próximo tique/clique pega).
    const timeoutConta = inst === 'XP' ? TIMEOUT_XP_MS : TIMEOUT_CONTA_MS
    if (Date.now() - inicio + timeoutConta > SAFE_LIMIT_MS) break
    processados++
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutConta)
    try {
      const res = await fetch(`${baseUrl}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': cronSecret, apikey },
        body: JSON.stringify({ contaId: c.id }),
        signal: ctrl.signal,
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${txt.slice(0, 200)}`)
      }
      ok++
    } catch (e) {
      erro++
      const msg = (e as Error)?.name === 'AbortError' ? `timeout (${timeoutConta / 1000}s)` : ((e as Error)?.message ?? 'erro')
      falhas.push({ contaId: c.id, inst, msg })
      await supabase.from('cliente_contas')
        .update({ ultimo_status: 'erro', ultimo_erro: msg }).eq('id', c.id)
    } finally {
      clearTimeout(t)
    }
  }

  // ── Log da rodada ────────────────────────────────────────────────────────────
  await supabase.from('sync_log').insert({
    iniciado_em: new Date(inicio).toISOString(),
    finalizado_em: new Date().toISOString(),
    origem,
    total: processados,
    ok,
    erro,
    detalhe: falhas.length ? { falhas: falhas.slice(0, 50) } : null,
  })

  // restantes = selecionados que não couberam no orçamento (voltam à fila)
  const restantes = pendentes.length - processados
  return jsonResponse({ origem, total: processados, ok, erro, restantes })
})
