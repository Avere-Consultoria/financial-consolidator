import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, validarOwnershipCliente, ehChamadaSistema, type AuthContext } from '../_shared/auth.ts'
import { toDateOnly, ontemISO } from '../_shared/dates.ts'
import { extrairDetalhes } from '../_shared/detalhes.ts'
import { mapTipoLabel, mapSubTipoPadrao } from '../_shared/assetClassMap.ts'
import { fetchConsolidator, ConsolidatorError } from '../_shared/consolidator.ts'
import {
  resolverOuCriarCanonico,
  sugerirCanonicoComClassificacao,
  type Identificador,
} from '../_shared/canonico.ts'
import { normalizarSubTipo } from '../_shared/normalizarSubTipo.ts'
import { resolverContaPorId, resolverContaPorCodigo, resolverContaPrimaria, marcarSync } from '../_shared/contas.ts'
import type { UnifiedAsset } from '../_shared/types.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-agora-position
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const sistema = await ehChamadaSistema(req)
    let ctx: AuthContext | null = null
    if (!sistema) {
      const authResult = await validarAuth(req)
      if ('error' in authResult) return authResult.error
      ctx = authResult.ctx
    }

    const supabase = createServiceClient()

    const { cpfCnpj, accountCode, clientId, contaId } = await req.json().catch(() => ({}))

    // ── Resolve a CONTA Ágora (por contaId, pela conta/accountCode ou primária) ──
    let conta = null
    if (contaId) conta = await resolverContaPorId(supabase, contaId)
    else if (accountCode) conta = await resolverContaPorCodigo(supabase, 'AGORA', accountCode)
    else if (clientId) conta = await resolverContaPrimaria(supabase, 'AGORA', clientId)
    if (!conta) return errorResponse('Conta Ágora não encontrada (informe contaId, accountCode ou clientId)', 404)

    // Documento (CPF/CNPJ) + conta vêm da cadastro; fallback ao que veio no body.
    const doc = conta.documento ?? cpfCnpj
    const acc = conta.codigo ?? accountCode
    if (!doc || !acc) return errorResponse('Documento (CPF/CNPJ) e conta da Ágora são obrigatórios', 400)

    if (!sistema) {
      const ownerError = await validarOwnershipCliente(ctx!, conta.cliente_id)
      if (ownerError) return ownerError
    }

    const payload = await fetchConsolidator(`/api/v1/position/agora/${doc}/${acc}`, { method: 'GET' })
    const data = payload?.data || payload

    if (!data?.totalAmount) return errorResponse('Consolidador não retornou patrimônio', 502)

    const assets: UnifiedAsset[] = data.assets ?? []

    // Ágora é D0, construída na hora (confirmado com o suporte) e não devolve data
    // de referência. Num sync de madrugada, representa o fechamento de ontem.
    // Data canônica = sync − 1 (ontem).
    const dataReferencia    = ontemISO()
    const dataSincronizacao = new Date().toISOString()

    // Resolver canônico por ativo
    const ativoCanonicoIds: (string | null)[] = []
    for (const asset of assets) {
      ativoCanonicoIds.push(await resolverCanonicoAgora(supabase, asset))
    }

    const totais = calcularTotais(assets, data.totalAmount)

    const { data: snapshot, error: snapError } = await supabase
      .from('posicao_agora_snapshots')
      .upsert({
        cliente_id:         conta.cliente_id,
        conta_id:           conta.id,
        data_referencia:    dataReferencia,
        data_sincronizacao: dataSincronizacao,
        patrimonio_total:   totais.patrimonio_total,
        saldo_rf:           totais.saldo_rf,
        saldo_rv:           totais.saldo_rv,
        saldo_fundos:       totais.saldo_fundos,
        saldo_caixa:        totais.saldo_caixa,
        source:             'AGORA_API'
      }, { onConflict: 'cliente_id,conta_id,data_referencia' })
      .select('id')
      .single()

    if (snapError || !snapshot) {
      console.error('Erro snapshot Ágora:', snapError?.message)
      return errorResponse('Falha ao salvar snapshot', 500)
    }

    if (assets.length > 0) {
      const ativos = assets.map((a, idx) => ({
        snapshot_id:         snapshot.id,
        ativo_canonico_id:   ativoCanonicoIds[idx],
        asset_class:         a.assetClass,
        tipo:                mapTipoLabel(a.assetClass),
        sub_tipo:            normalizarSubTipo(resolverSubTipoAgora(a)),
        emissor:             a.extra?.issuerName || a.extra?.companyName || a.name || 'Ágora',
        ticker:              a.ticker || null,
        security_code:       a.securityCode || null,
        valor_bruto:         Number(a.grossValue || 0),
        valor_liquido:       Number(a.netValue || a.grossValue || 0),
        custo_total:         a.extra?.costPrice ? Number(a.extra.costPrice) : null,
        preco_unitario:      a.marketPrice ? Number(a.marketPrice) : null,
        quantidade:          Number(a.quantity ?? 1),
        taxa:                a.extra?.bondRate || null,
        taxa_percentual:     a.extra?.preTaxPercentage ? Number(a.extra.preTaxPercentage) : null,
        indexer_percentual:  a.extra?.indexerPercentage ? Number(a.extra.indexerPercentage) : null,
        valorizacao:         a.extra?.valueAppreciation ? Number(a.extra.valueAppreciation) : null,
        percent_valorizacao: a.extra?.percentAppreciation ? Number(a.extra.percentAppreciation) : null,
        ir_valor:            a.extra?.bondTaxValue ? Number(a.extra.bondTaxValue) : null,
        iof_valor:           a.extra?.iofTaxValue ? Number(a.extra.iofTaxValue) : null,
        ir_percentual:       a.extra?.bondTaxPercentage || null,
        ir_descricao:        a.extra?.bondTaxDescription || null,
        data_vencimento:     toDateOnly(a.maturityDate),
        data_aplicacao:      toDateOnly(a.extra?.acquisitionDate),
        liquidez_diaria:     a.isLiquidity ?? false,
      }))

      // Dedup defensivo pela MESMA chave do índice único posicao_agora_ativos_unq,
      // mantendo `assets` alinhado p/ as aquisições. Sem isto, uma linha repetida
      // derruba o batch inteiro e a conta fica com snapshot mas SEM ativos.
      const vistos = new Set<string>()
      const ativosU: any[] = []
      const assetsU: UnifiedAsset[] = []
      ativos.forEach((r, idx) => {
        const k = `${r.emissor ?? ''}|${r.security_code ?? ''}|${r.ticker ?? ''}|${r.sub_tipo ?? ''}|${r.data_vencimento ?? ''}|${r.valor_bruto}|${r.valor_liquido}`
        if (vistos.has(k)) return
        vistos.add(k); ativosU.push(r); assetsU.push(assets[idx])
      })

      await supabase.from('posicao_agora_ativos').delete().eq('snapshot_id', snapshot.id)
      const { data: inseridos, error: ativosError } = await supabase
        .from('posicao_agora_ativos')
        .insert(ativosU)
        .select('id')

      if (ativosError || !inseridos || inseridos.length !== ativosU.length) {
        // Não engole: snapshot sem ativos deixa a Home meia-boca silenciosamente.
        console.error('Erro ativos Ágora:', ativosError?.message)
        throw new ConsolidatorError(`Falha ao salvar ativos Ágora: ${ativosError?.message ?? 'contagem divergente'}`, 500)
      } else {
        // ── Aquisições (histórico) para TD e Fundos ──────────────────────
        const aquisicoes: any[] = []
        assetsU.forEach((a, idx) => {
          const ativoId = inseridos[idx].id
          const acqs = a.extra?.acquisitions ?? []
          if (!Array.isArray(acqs) || acqs.length === 0) return

          const isTd     = a.assetClass === 'FIXED_INCOME' && !!a.extra?.bondType
          const isFundo  = a.assetClass === 'INVESTMENT_FUND'

          for (const acq of acqs) {
            if (isTd) {
              aquisicoes.push({
                ativo_id:           ativoId,
                tipo_aquisicao:     'TESOURO_DIRETO',
                application_date:   toDateOnly(acq.applicationDate),
                quantity:           acq.bondQuantity ?? null,
                gross_value:        acq.positionValue ?? null,
                net_value:          acq.netValue ?? null,
                ir_value:           acq.irPrice ?? null,
                iof_value:          acq.iofPrice ?? null,
                operation_status:   acq.operationStatus ?? null,
                purchase_price:     acq.purchasePrice ?? null,
                market_price:       acq.marketPrice ?? null,
                profit_value:       acq.profitValue ?? null,
                tax_rate:           acq.tax ?? null,
                days:               acq.days ?? null,
                market_type:        acq.marketType ?? null,
                issuer_name:        acq.issuerName ?? null,
                bond_name:          acq.bondName ?? null,
                index_name:         acq.index ?? null,
              })
            } else if (isFundo) {
              aquisicoes.push({
                ativo_id:           ativoId,
                tipo_aquisicao:     'FUNDO',
                application_date:   toDateOnly(acq.certificateDate),
                reference_date:     toDateOnly(acq.referenceDate),
                quantity:           acq.quotesQuantity ?? null,
                gross_value:        acq.grossPosition ?? null,
                net_value:          acq.netPosition ?? null,
                ir_value:           acq.irValue ?? null,
                iof_value:          acq.iofValue ?? null,
              })
            }
          }
        })

        if (aquisicoes.length > 0) {
          const { error: errAcq } = await supabase.from('posicao_agora_aquisicoes').insert(aquisicoes)
          if (errAcq) console.error('Erro aquisições Ágora:', errAcq.message)
          else console.log(`${aquisicoes.length} aquisição(ões) Ágora persistida(s)`)
        }
      }
    }

    await marcarSync(supabase, conta.id, 'ok')

    return jsonResponse({ success: true, data })

  } catch (err: unknown) {
    if (err instanceof ConsolidatorError) {
      console.error('Erro no consolidador Ágora:', err.message)
      return errorResponse(err.message, err.status)
    }
    console.error('Erro na Edge Function Ágora:', (err as Error)?.message)
    return errorResponse('Erro interno', 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Resolução de canônico (Ágora)
// Prioridade: security_code (ISIN) > CNPJ > ticker > TD composto (bondType + vencimento)
// ─────────────────────────────────────────────────────────────────────────────

async function resolverCanonicoAgora(supabase: any, a: UnifiedAsset): Promise<string | null> {
  const lookup = coletarIdentificadoresAgora(a)
  const principal = lookup[0]
  if (!principal) return null

  const subTipoNormalizado = normalizarSubTipo(resolverSubTipoAgora(a))

  return await resolverOuCriarCanonico(
    supabase,
    lookup,
    sugerirCanonicoComClassificacao(a, 'AGORA', { sub_tipo_canonico: subTipoNormalizado }),
    {
      instituicao_origem:      'AGORA',
      identificador_principal: principal,
      nome_ativo:              a.name || '',
      emissor_original:        a.extra?.issuerName ?? a.extra?.companyName ?? a.name ?? null,
      classe_original:         mapTipoLabel(a.assetClass),
      liquidez_api_original:   a.isLiquidity ? '0' : null,
      vencimento_api_original: toDateOnly(a.maturityDate),
      index_rate:              a.indexRate ?? null,
    },
    a.extra ?? null,                                       // o extra da Ágora já é o cru genérico
    extrairDetalhes('AGORA', subTipoNormalizado, a.extra),
  )
}

function coletarIdentificadoresAgora(a: UnifiedAsset): Identificador[] {
  const ids: Identificador[] = []
  if (a.securityCode)      ids.push({ tipo: 'ISIN',   codigo: a.securityCode })
  if (a.extra?.cnpj)       ids.push({ tipo: 'CNPJ',   codigo: a.extra.cnpj })
  if (a.ticker)            ids.push({ tipo: 'TICKER', codigo: a.ticker })

  // Tesouro Direto: chave composta bondType + vencimento
  if (a.extra?.bondType && a.maturityDate) {
    const composto = `${a.extra.bondType}-${toDateOnly(a.maturityDate)}`
    ids.push({ tipo: 'TICKER', codigo: composto })
  }

  return ids
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resolverSubTipoAgora(a: UnifiedAsset): string {
  return a.extra?.bondType || a.extra?.securityType || mapSubTipoPadrao(a.assetClass) || ''
}

function calcularTotais(assets: UnifiedAsset[], totalAmount: number) {
  const t = {
    patrimonio_total: totalAmount,
    saldo_rf: 0, saldo_rv: 0, saldo_fundos: 0, saldo_caixa: 0,
  }
  for (const a of assets) {
    const v = a.grossValue ?? 0
    switch (a.assetClass) {
      case 'FIXED_INCOME':    t.saldo_rf     += v; break
      case 'EQUITIES':        t.saldo_rv     += v; break
      case 'INVESTMENT_FUND': t.saldo_fundos += v; break
      case 'CASH':            t.saldo_caixa  += v; break
    }
  }
  return t
}
