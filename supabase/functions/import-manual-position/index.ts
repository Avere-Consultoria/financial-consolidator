import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { toDateOnly } from '../_shared/dates.ts'
import { mapTipoLabel } from '../_shared/assetClassMap.ts'
import { resolverOuCriarCanonico, sugerirCanonicoComClassificacao, type Identificador } from '../_shared/canonico.ts'
import { normalizarSubTipo } from '../_shared/normalizarSubTipo.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: import-manual-position
//
// Ingestão semiautomática (PDF → JSON pelo agente de IA). Máquina-pra-máquina:
// o agente faz POST com header `x-import-key` e o corpo { snapshot, ativos }.
// Pluga no MESMO pipeline canônico das APIs.
//
// Deploy SEM verificação de JWT (o agente não tem JWT de usuário):
//   supabase functions deploy import-manual-position --no-verify-jwt
// A autenticação real é o segredo x-import-key (env MANUAL_IMPORT_KEY).
// ─────────────────────────────────────────────────────────────────────────────

interface ManualAtivo {
  asset_class?: string
  sub_tipo?: string
  emissor?: string
  emissor_nome?: string
  emissor_cnpj?: string
  ticker?: string
  isin?: string
  valor_bruto?: number
  valor_liquido?: number
  quantidade?: number
  preco_mercado?: number
  maturity_date?: string
  data_vencimento?: string
  issue_date?: string
  data_aplicacao?: string
  benchmark?: string
  rentabilidade?: number
  yield_avg?: number
}

const SUBTIPOS_TESOURO = new Set(['NTN-B', 'NTNB', 'NTN-F', 'NTNF', 'NTN-C', 'NTNC', 'LTN', 'LFT'])

function nomeEmissor(a: ManualAtivo): string {
  return (a.emissor_nome ?? a.emissor ?? '').trim()
}

function coletarIdentificadores(a: ManualAtivo): Identificador[] {
  const ids: Identificador[] = []
  const isFundo = (a.asset_class ?? '').toUpperCase() === 'INVESTMENT_FUND'

  // ISIN e ticker identificam o ATIVO (únicos por papel) — prioridade
  if (a.isin)   ids.push({ tipo: 'ISIN',   codigo: String(a.isin).trim() })
  if (a.ticker) ids.push({ tipo: 'TICKER', codigo: String(a.ticker).trim() })

  // CNPJ só identifica o ATIVO quando é FUNDO (o CNPJ é do próprio fundo).
  // Para debênture/COE/ação o CNPJ é do EMISSOR (compartilhado entre vários
  // papéis) → NÃO serve como identidade do ativo, senão colariam no mesmo canônico.
  if (isFundo && a.emissor_cnpj) ids.push({ tipo: 'CNPJ', codigo: String(a.emissor_cnpj).replace(/\D/g, '') })

  // Tesouro Direto: chave composta sub_tipo + vencimento (igual Ágora)
  const st = (a.sub_tipo ?? '').toUpperCase().trim()
  const venc = toDateOnly(a.maturity_date ?? a.data_vencimento)
  if (SUBTIPOS_TESOURO.has(st) && venc) {
    ids.push({ tipo: 'TICKER', codigo: `${st}-${venc}` })
  }
  return ids
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // ── Auth do agente: segredo compartilhado ───────────────────────────────
  const expected = Deno.env.get('MANUAL_IMPORT_KEY')
  const provided = req.headers.get('x-import-key')
  if (!expected || provided !== expected) {
    return errorResponse('Não autorizado (x-import-key inválido).', 401)
  }

  try {
    const body = await req.json().catch(() => null)
    const snapshot = body?.snapshot
    const ativos: ManualAtivo[] = Array.isArray(body?.ativos) ? body.ativos : []

    if (!snapshot?.cliente_cod_avere || !snapshot?.instituicao || !snapshot?.data_referencia) {
      return errorResponse('snapshot precisa de cliente_cod_avere, instituicao e data_referencia.', 400)
    }

    const supabase = createServiceClient()
    const instituicao = String(snapshot.instituicao).trim()
    const dataReferencia = toDateOnly(snapshot.data_referencia)
    if (!dataReferencia) return errorResponse('data_referencia inválida.', 400)

    // ── Resolve cliente por codigo_avere ───────────────────────────────────
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('codigo_avere', String(snapshot.cliente_cod_avere).trim())
      .maybeSingle()

    if (!cliente) {
      return errorResponse(`Cliente não encontrado para codigo_avere "${snapshot.cliente_cod_avere}".`, 404)
    }

    // ── Resolve canônico por ativo (mesmo pipeline das APIs) ───────────────
    const erros: string[] = []
    let canonicosResolvidos = 0
    const ativoCanonicoIds: (string | null)[] = []

    for (const a of ativos) {
      try {
        const unified = {
          assetClass:   a.asset_class ?? 'OTHER',
          name:         nomeEmissor(a) || a.ticker || null,
          ticker:       a.ticker ?? null,
          securityCode: a.isin ?? null,
          grossValue:   a.valor_bruto ?? null,
          netValue:     a.valor_liquido ?? a.valor_bruto ?? null,
          marketPrice:  a.preco_mercado ?? null,
          quantity:     a.quantidade ?? null,
          maturityDate: a.maturity_date ?? a.data_vencimento ?? null,
          benchMark:    a.benchmark ?? null,
          isLiquidity:  false,
          extra: {
            cnpj:       a.emissor_cnpj ?? null,
            bondType:   a.sub_tipo ?? null,
            issuerName: nomeEmissor(a) || null,
          },
        }
        const ids = coletarIdentificadores(a)
        const subTipoNorm = normalizarSubTipo(a.sub_tipo ?? '')

        let canonicoId: string | null = null
        if (ids.length > 0) {
          canonicoId = await resolverOuCriarCanonico(
            supabase,
            ids,
            sugerirCanonicoComClassificacao(unified, instituicao as any, { sub_tipo_canonico: subTipoNorm }),
            {
              instituicao_origem:      instituicao as any,
              identificador_principal: ids[0],
              nome_ativo:              unified.name ?? '',
              emissor_original:        nomeEmissor(a) || null,
              classe_original:         mapTipoLabel(unified.assetClass),
              liquidez_api_original:   null,
              vencimento_api_original: toDateOnly(unified.maturityDate),
              index_rate:              a.benchmark ?? null,
            },
          )
        }
        if (canonicoId) canonicosResolvidos++
        ativoCanonicoIds.push(canonicoId)
      } catch (e) {
        erros.push(`Ativo "${nomeEmissor(a) || a.ticker || '?'}": ${(e as Error).message}`)
        ativoCanonicoIds.push(null)
      }
    }

    // ── Upsert snapshot (cliente + instituicao + data) ─────────────────────
    const { data: snap, error: snapErr } = await supabase
      .from('posicao_manual_snapshots')
      .upsert({
        cliente_id:         cliente.id,
        instituicao:        instituicao,
        data_referencia:    dataReferencia,
        data_sincronizacao: new Date().toISOString(),
        patrimonio_total:   snapshot.patrimonio_total ?? null,
        saldo_cc:           snapshot.saldo_cc ?? null,
        saldo_rf:           snapshot.saldo_rf ?? null,
        saldo_fundos:       snapshot.saldo_fundos ?? null,
        saldo_rv:           snapshot.saldo_rv ?? null,
        saldo_prev:         snapshot.saldo_prev ?? null,
        saldo_cripto:       snapshot.saldo_cripto ?? null,
        saldo_outros:       snapshot.saldo_outros ?? null,
        is_month_end:       snapshot.is_month_end ?? false,
        source:             snapshot.source ?? 'PDF_MANUAL',
      }, { onConflict: 'cliente_id,instituicao,data_referencia' })
      .select('id')
      .single()

    if (snapErr || !snap) {
      return errorResponse(`Falha ao salvar snapshot: ${snapErr?.message}`, 500)
    }

    // ── Substitui ativos do snapshot ───────────────────────────────────────
    await supabase.from('posicao_manual_ativos').delete().eq('snapshot_id', snap.id)

    let ativosInseridos = 0
    if (ativos.length > 0) {
      const rows = ativos.map((a, i) => ({
        snapshot_id:       snap.id,
        ativo_canonico_id: ativoCanonicoIds[i],
        asset_class:       a.asset_class ?? null,
        tipo:              mapTipoLabel(a.asset_class ?? 'OTHER'),
        sub_tipo:          normalizarSubTipo(a.sub_tipo ?? ''),
        emissor:           nomeEmissor(a) || a.ticker || null,
        cnpj:              a.emissor_cnpj ? String(a.emissor_cnpj).replace(/\D/g, '') : null,
        ticker:            a.ticker ?? null,
        isin:              a.isin ?? null,
        valor_bruto:       a.valor_bruto ?? null,
        valor_liquido:     a.valor_liquido ?? a.valor_bruto ?? null,
        quantidade:        a.quantidade ?? null,
        preco_mercado:     a.preco_mercado ?? null,
        data_vencimento:   toDateOnly(a.maturity_date ?? a.data_vencimento),
        data_aplicacao:    toDateOnly(a.issue_date ?? a.data_aplicacao),
        benchmark:         a.benchmark ?? null,
        rentabilidade:     a.rentabilidade ?? null,
        yield_avg:         a.yield_avg ?? null,
      }))
      const { error: ativosErr } = await supabase.from('posicao_manual_ativos').insert(rows)
      if (ativosErr) return errorResponse(`Falha ao salvar ativos: ${ativosErr.message}`, 500)
      ativosInseridos = rows.length
    }

    // ── Auto-registra a instituição (cor padrão, ajustável depois) ─────────
    const { data: instExiste } = await supabase
      .from('instituicoes')
      .select('id')
      .ilike('nome', instituicao)
      .maybeSingle()
    if (!instExiste) {
      await supabase.from('instituicoes').insert({ nome: instituicao, cor_primaria: '#64748B', tipo: 'MANUAL' })
    }

    return jsonResponse({
      ok: true,
      instituicao,
      data_referencia: dataReferencia,
      snapshot_id: snap.id,
      ativos_inseridos: ativosInseridos,
      canonicos_resolvidos: canonicosResolvidos,
      erros,
    })

  } catch (err) {
    console.error('Erro import-manual-position:', (err as Error)?.message)
    return errorResponse(`Erro interno: ${(err as Error)?.message}`, 500)
  }
})
