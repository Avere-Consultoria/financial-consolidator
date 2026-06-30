import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, exigirMaster, ehChamadaSistema } from '../_shared/auth.ts'
import { fetchConsolidator, ConsolidatorError } from '../_shared/consolidator.ts'
import { resolverContaPorId } from '../_shared/contas.ts'
import { resolverCanonicoXP } from '../_shared/resolveXP.ts'
import { resolverCanonicoBTG } from '../_shared/resolveBTG.ts'
import { resolverCanonicoAgora } from '../_shared/resolveAgora.ts'
import { resolverCanonicoAvenue } from '../_shared/resolveAvenue.ts'
import type { UnifiedAsset } from '../_shared/types.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: reprocessar-canonicos
// Deploy: supabase functions deploy reprocessar-canonicos --no-verify-jwt
//
// Re-resolve os ativos CANÔNICOS a partir do raw já arquivado (posicao_raw), SEM
// nova chamada à corretora. NÃO escreve snapshot nem toca posicao_*; só atualiza
// canônico/dicionário e semeia biblioteca quando vazia. Respeita precedência (não
// pisa em 'manual'). Cobre "mudei um mapeamento / não extraí um campo" sem gastar
// a janela de chamada. Só posição VIVA (o que está em posicao_raw).
//
// Dois modos por instituição:
//   XP/BTG/AGORA → /transform re-mapeia o payload → UnifiedAsset[] → resolver.
//   AVENUE       → resolve direto dos itens crus (a classificação é por item).
//
// body: { contaId?, clienteId?, instituicao? }  (qualquer combinação; vazio = tudo)
// ─────────────────────────────────────────────────────────────────────────────

const VIA_TRANSFORM: Record<string, (supabase: any, a: UnifiedAsset) => Promise<string | null>> = {
  XP:    resolverCanonicoXP,
  BTG:   resolverCanonicoBTG,
  AGORA: resolverCanonicoAgora,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const sistema = await ehChamadaSistema(req)
    if (!sistema) {
      const authResult = await validarAuth(req)
      if ('error' in authResult) return authResult.error
      // Reprocesso reescreve a inteligência canônica GLOBAL → só master no caminho
      // de usuário (o cron já entra por ehChamadaSistema, dispensando JWT/master).
      const masterError = exigirMaster(authResult.ctx)
      if (masterError) return masterError
    }

    const supabase = createServiceClient()

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const contaId: string | null = body.contaId ?? null
    const clienteId: string | null = body.clienteId ?? null
    const instituicao: string | null = body.instituicao ? String(body.instituicao).toUpperCase() : null
    // Lote: o front chama em fatias p/ não estourar o tempo/CPU da edge (WORKER_LIMIT)
    // com a base cheia. Cada chamada processa `limite` contas a partir de `offset`.
    const limite = Number(body.limite) > 0 ? Number(body.limite) : 5
    const offset = Number(body.offset) >= 0 ? Number(body.offset) : 0

    // 1) Carrega só as CHAVES (sem payload) — leve. Carregar todos os payloads de
    //    uma vez estourava a memória da edge (546/WORKER_LIMIT) com a base cheia.
    let query = supabase
      .from('posicao_raw')
      .select('id, cliente_id, conta_id, instituicao, data_referencia')
      .order('data_referencia', { ascending: false })
    if (contaId)     query = query.eq('conta_id', contaId)
    if (clienteId)   query = query.eq('cliente_id', clienteId)
    if (instituicao) query = query.eq('instituicao', instituicao)

    const { data: rows, error: rawErr } = await query
    if (rawErr) return errorResponse(`Erro ao ler posicao_raw: ${rawErr.message}`, 500)
    if (!rows || rows.length === 0) {
      return jsonResponse({ contas: 0, ativos: 0, instituicoes: [], mensagem: 'Nada a reprocessar no escopo.' })
    }

    // Só a posição VIVA mais recente por (conta, instituição) — o canônico é por-ativo
    // e idempotente; basta o raw mais novo (rows já vêm ordenadas desc).
    const maisRecente = new Map<string, any>()
    for (const r of rows) {
      const k = `${r.conta_id}|${r.instituicao}`
      if (!maisRecente.has(k)) maisRecente.set(k, r)
    }

    // Ordena estável (por id) p/ a paginação por offset ser determinística entre chamadas.
    const lista = Array.from(maisRecente.values()).sort((a, b) => String(a.id).localeCompare(String(b.id)))
    const totalContasEscopo = lista.length
    const fatia = lista.slice(offset, offset + limite)

    let totalAtivos = 0
    let totalContas = 0
    let falhas = 0
    const instituicoesTocadas = new Set<string>()
    const ignoradas = new Set<string>()

    for (const r of fatia) {
      const inst = String(r.instituicao).toUpperCase()
      const resolver = inst === 'AVENUE' ? null : VIA_TRANSFORM[inst]
      if (inst !== 'AVENUE' && !resolver) { ignoradas.add(inst); continue }

      // Resiliente: uma conta que falhe (payload gigante, etc.) é registrada e
      // pulada — não derruba o lote nem aborta o loop do front.
      try {
        // 2) Carrega o payload SÓ desta conta (um por vez → não estoura a memória).
        const { data: linha } = await supabase
          .from('posicao_raw').select('payload').eq('id', r.id).single()
        const payload = linha?.payload
        if (payload == null) continue

        if (inst === 'AVENUE') {
          // Avenue resolve direto do item cru (sem /transform).
          const itens: any[] = Array.isArray(payload?.items) ? payload.items : []
          for (const item of itens) {
            await resolverCanonicoAvenue(supabase, item)
            totalAtivos++
          }
        } else {
          // accountNumber é só ecoado pelo mapper; resolvemos p/ coerência/log.
          const conta = await resolverContaPorId(supabase, r.conta_id)
          const accountNumber = conta?.codigo ?? ''

          const transformed = await fetchConsolidator('/api/v1/position/transform', {
            method: 'POST',
            body: JSON.stringify({ institution: inst, accountNumber, payload }),
          })
          const assets: UnifiedAsset[] = transformed?.data?.assets ?? []
          for (const asset of assets) {
            await resolver!(supabase, asset)
            totalAtivos++
          }
        }
        totalContas++
        instituicoesTocadas.add(inst)
      } catch (e) {
        falhas++
        console.error(`reprocesso: falha na conta ${r.conta_id} (${inst}):`, (e as Error)?.message)
      }
    }

    const offsetProximo = offset + limite < totalContasEscopo ? offset + limite : null
    return jsonResponse({
      contas: totalContas,                 // contas processadas NESTA fatia
      contasTotal: totalContasEscopo,      // total no escopo
      ativos: totalAtivos,
      falhas,                              // contas puladas por erro nesta fatia
      offsetProximo,                       // null = acabou; senão, chamar de novo com este offset
      instituicoes: Array.from(instituicoesTocadas),
      ignoradas: ignoradas.size ? Array.from(ignoradas) : undefined,
    })

  } catch (err: unknown) {
    if (err instanceof ConsolidatorError) {
      console.error('Erro no consolidador (reprocesso):', err.message)
      return errorResponse(err.message, err.status)
    }
    console.error('Erro na Edge reprocessar-canonicos:', (err as Error)?.message)
    return errorResponse('Erro interno', 500)
  }
})
