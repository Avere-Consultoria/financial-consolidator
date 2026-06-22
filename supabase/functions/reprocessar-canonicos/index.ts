import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, ehChamadaSistema } from '../_shared/auth.ts'
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
    }

    const supabase = createServiceClient()

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const contaId: string | null = body.contaId ?? null
    const clienteId: string | null = body.clienteId ?? null
    const instituicao: string | null = body.instituicao ? String(body.instituicao).toUpperCase() : null

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

    let totalAtivos = 0
    let totalContas = 0
    const instituicoesTocadas = new Set<string>()
    const ignoradas = new Set<string>()

    for (const r of maisRecente.values()) {
      const inst = String(r.instituicao).toUpperCase()
      const resolver = inst === 'AVENUE' ? null : VIA_TRANSFORM[inst]
      if (inst !== 'AVENUE' && !resolver) { ignoradas.add(inst); continue }

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
        totalContas++
        instituicoesTocadas.add(inst)
        continue
      }

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
      totalContas++
      instituicoesTocadas.add(inst)
    }

    return jsonResponse({
      contas: totalContas,
      ativos: totalAtivos,
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
