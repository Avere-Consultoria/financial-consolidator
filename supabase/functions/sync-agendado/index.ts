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
  const baseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const apikey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  let ok = 0, erro = 0
  const falhas: Array<{ contaId: string; inst: string; msg: string }> = []

  for (const c of pendentes) {
    const inst = (c as any).instituicoes?.codigo as string
    const fn = FN[inst]
    if (!fn) { erro++; falhas.push({ contaId: c.id, inst, msg: 'instituição sem function' }); continue }
    try {
      const res = await fetch(`${baseUrl}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': cronSecret, apikey },
        body: JSON.stringify({ contaId: c.id }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${txt.slice(0, 200)}`)
      }
      ok++
    } catch (e) {
      erro++
      const msg = (e as Error)?.message ?? 'erro'
      falhas.push({ contaId: c.id, inst, msg })
      // carimba o erro na conta (a function só carimba sucesso)
      await supabase.from('cliente_contas')
        .update({ ultimo_status: 'erro', ultimo_erro: msg }).eq('id', c.id)
    }
  }

  // ── Log da rodada ────────────────────────────────────────────────────────────
  await supabase.from('sync_log').insert({
    iniciado_em: new Date().toISOString(),
    finalizado_em: new Date().toISOString(),
    origem,
    total: pendentes.length,
    ok,
    erro,
    detalhe: falhas.length ? { falhas: falhas.slice(0, 50) } : null,
  })

  return jsonResponse({ origem, total: pendentes.length, ok, erro })
})
