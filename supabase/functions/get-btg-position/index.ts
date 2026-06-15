import { classifyAvere, suggestLiquidezAvere } from '../_shared/classifyAvere.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, validarOwnershipCliente, ehChamadaSistema, type AuthContext } from '../_shared/auth.ts'
import { toDateOnly, todayISO } from '../_shared/dates.ts'
import { mapTipoLabel, mapSubTipoPadrao } from '../_shared/assetClassMap.ts'
import { fetchConsolidator, ConsolidatorError } from '../_shared/consolidator.ts'
import {
  resolverOuCriarCanonico,
  sugerirCanonicoComClassificacao,
  type Identificador,
} from '../_shared/canonico.ts'
import { normalizarSubTipo } from '../_shared/normalizarSubTipo.ts'
import { resolverContaPorId, resolverContaPorCodigo, marcarSync } from '../_shared/contas.ts'
import type { UnifiedAsset } from '../_shared/types.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-btg-position
// Deploy: supabase functions deploy get-btg-position --no-verify-jwt
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

    const url = new URL(req.url)
    let accountNumber = url.searchParams.get('account')
    let contaId: string | null = null
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      accountNumber = accountNumber ?? body.account
      contaId = body.contaId ?? null
    }

    // ── Resolve a CONTA (por contaId ou pelo nº da conta) + autorização ──
    const conta = contaId
      ? await resolverContaPorId(supabase, contaId)
      : (accountNumber ? await resolverContaPorCodigo(supabase, 'BTG', accountNumber) : null)
    if (!conta) return errorResponse('Conta BTG não encontrada (informe account ou contaId)', 404)

    accountNumber = conta.codigo
    if (!accountNumber) return errorResponse('Conta BTG sem número cadastrado', 400)

    if (!sistema) {
      const ownerError = await validarOwnershipCliente(ctx!, conta.cliente_id)
      if (ownerError) return ownerError
    }

    console.log('Buscando posição BTG…')

    const consolidatorJson = await fetchConsolidator(`/api/v1/position/btg/${accountNumber}`)
    const position = consolidatorJson?.data
    if (!position) return errorResponse('Nenhum dado retornado pelo consolidador', 502)

    const assets: UnifiedAsset[] = position.assets ?? []

    // Datas: positionDate vem da API (data REAL da foto); sincronização é now()
    const dataReferencia    = toDateOnly(position.positionDate) ?? todayISO()
    const dataSincronizacao = new Date().toISOString()

    const totais   = calcularTotais(assets)
    const alocacao = [
      { classe: 'Conta Corrente',         valor: totais.saldo_cc },
      { classe: 'Renda Fixa',             valor: totais.saldo_rf },
      { classe: 'Fundos de Investimento', valor: totais.saldo_fundos },
    ]

    // ── Resolver canônico de cada ativo (sequencial pra evitar race) ──────
    const parsed = []
    for (const asset of assets) {
      const ativoCanonicoId = await resolverCanonicoBTG(supabase, asset)
      parsed.push(parseAtivo(asset, ativoCanonicoId))
    }

    // ── Persistir no Supabase (conta já resolvida na autorização) ──────────
    {
      const { data: snapshot, error: snapError } = await supabase
        .from('posicao_btg_snapshots')
        .upsert({
          cliente_id:         conta.cliente_id,
          conta_id:           conta.id,
          data_referencia:    dataReferencia,
          data_sincronizacao: dataSincronizacao,
          patrimonio_total:   totais.patrimonio_total,
          saldo_cc:           totais.saldo_cc,
          saldo_rf:           totais.saldo_rf,
          saldo_fundos:       totais.saldo_fundos,
          saldo_rv:           totais.saldo_rv,
          saldo_prev:         totais.saldo_prev,
          saldo_cripto:       totais.saldo_cripto,
          saldo_outros:       totais.saldo_outros,
          is_month_end:       false,
          source:             'BTG_IAAS_V1',
        }, { onConflict: 'cliente_id,conta_id,data_referencia' })
        .select('id')
        .single()

      if (snapError || !snapshot) {
        console.error('Erro ao salvar snapshot:', snapError?.message)
      } else {
        await persistirAtivos(supabase, snapshot.id, parsed)
      }
    }

    await marcarSync(supabase, conta.id, 'ok')

    return jsonResponse({
      patrimonioTotal: totais.patrimonio_total,
      dataReferencia,
      alocacao,
      ativos: parsed.map(p => p.frontRow),
    })

  } catch (err: unknown) {
    if (err instanceof ConsolidatorError) {
      console.error('Erro no consolidador:', err.message)
      return errorResponse(err.message, err.status)
    }
    console.error('Erro na Edge Function BTG:', (err as Error)?.message)
    return errorResponse('Erro interno', 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Resolução de canônico (BTG)
// Prioridade: ISIN > CETIP (como ISIN) > CNPJ > TICKER > security_code (como TICKER)
// ─────────────────────────────────────────────────────────────────────────────

async function resolverCanonicoBTG(supabase: any, a: UnifiedAsset): Promise<string | null> {
  const lookup: Identificador[] = coletarIdentificadoresBTG(a)
  const principal = lookup[0]
  if (!principal) return null

  const subTipoNormalizado = normalizarSubTipo(parsearTicker(a.ticker ?? '', a.assetClass).subTipo)

  return await resolverOuCriarCanonico(
    supabase,
    lookup,
    sugerirCanonicoComClassificacao(a, 'BTG', { sub_tipo_canonico: subTipoNormalizado }),
    {
      instituicao_origem:      'BTG',
      identificador_principal: principal,
      nome_ativo:              a.name || '',
      emissor_original:        a.extra?.issuer ?? null,
      classe_original:         mapTipoLabel(a.assetClass),
      liquidez_api_original:   a.extra?.fundLiquidity != null && a.extra?.fundLiquidity !== ''
                                 ? String(a.extra.fundLiquidity)
                                 : (a.isLiquidity ? '0' : null),
      vencimento_api_original: toDateOnly(a.maturityDate),
      index_rate:              a.indexRate ?? null,
    },
  )
}

function coletarIdentificadoresBTG(a: UnifiedAsset): Identificador[] {
  const ids: Identificador[] = []
  if (a.extra?.isin)        ids.push({ tipo: 'ISIN',   codigo: a.extra.isin })
  if (a.extra?.cetipCode)   ids.push({ tipo: 'ISIN',   codigo: a.extra.cetipCode })
  if (a.extra?.cnpj)        ids.push({ tipo: 'CNPJ',   codigo: a.extra.cnpj })
  if (a.ticker)             ids.push({ tipo: 'TICKER', codigo: a.ticker })
  if (a.securityCode)       ids.push({ tipo: 'TICKER', codigo: a.securityCode })
  return ids
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistência dos ativos (bulk)
// ─────────────────────────────────────────────────────────────────────────────

async function persistirAtivos(
  supabase: any,
  snapshotId: string,
  parsed: ReturnType<typeof parseAtivo>[]
) {
  await supabase.from('posicao_btg_ativos').delete().eq('snapshot_id', snapshotId)

  if (parsed.length === 0) return

  const bulkAtivos = parsed.map(({ dbRow }) => ({ snapshot_id: snapshotId, ...dbRow }))
  const { data: inseridos, error: ativoError } = await supabase
    .from('posicao_btg_ativos')
    .insert(bulkAtivos)
    .select('id')

  if (ativoError || !inseridos || inseridos.length !== parsed.length) {
    console.error('Erro ao salvar ativos BTG:', ativoError?.message)
    return
  }

  const aquisicoesBulk: any[] = []
  const janelasBulk: any[] = []

  parsed.forEach(({ acquisitions, earlyTerminationSchedules }, idx) => {
    const ativoId = inseridos[idx].id

    for (const acq of acquisitions) {
      aquisicoesBulk.push({
        ativo_id:                 ativoId,
        acquisition_date:         acq.acquisitionDate ?? null,
        quantity:                 acq.quantity ?? null,
        initial_investment_value: acq.initialInvestmentValue ?? null,
        initial_investment_qty:   acq.initialInvestmentQuantity ?? null,
        cost_price:               acq.costPrice ?? null,
        gross_value:              acq.grossValue ?? null,
        net_value:                acq.netValue ?? null,
        income_tax:               acq.incomeTax ?? null,
        iof_tax:                  acq.iofTax ?? null,
        yield_to_maturity:        acq.yieldToMaturity ?? null,
        index_yield_rate:         acq.indexYieldRate ?? null,
        fts_id:                   acq.ftsId ?? null,
        transfer_id:              acq.transferId ?? null,
        interface_date:           acq.interfaceDate ?? null,
        is_virtual:               acq.isVirtual ?? false,
      })
    }

    for (const s of earlyTerminationSchedules) {
      janelasBulk.push({
        ativo_id:              ativoId,
        type:                  s.type ?? null,
        index_rate_multiplier: s.indexRateMultiplier ?? null,
        rate:                  s.rate ?? null,
        from_date:             s.fromDate ?? null,
        to_date:               s.toDate ?? null,
      })
    }
  })

  if (aquisicoesBulk.length > 0) {
    const { error } = await supabase.from('posicao_btg_aquisicoes').insert(aquisicoesBulk)
    if (error) console.error('Erro aquisições:', error.message)
  }

  if (janelasBulk.length > 0) {
    const { error } = await supabase.from('posicao_btg_janelas_liquidez').insert(janelasBulk)
    if (error) console.error('Erro janelas:', error.message)
  }

  console.log(`${parsed.length} ativos BTG persistidos`)
}

// ─────────────────────────────────────────────────────────────────────────────
// parseAtivo
// ─────────────────────────────────────────────────────────────────────────────

function parseAtivo(a: UnifiedAsset, ativoCanonicoId: string | null) {
  const ticker         = a.ticker ?? ''
  const issuer         = a.extra?.issuer ?? ''
  const { subTipo: subTipoRaw, codigo } = parsearTicker(ticker, a.assetClass)
  const subTipo        = normalizarSubTipo(subTipoRaw) ?? subTipoRaw
  const emissor        = issuer || a.name || ''
  const tipoLabel      = mapTipoLabel(a.assetClass)
  const rentabilidade  = formatRentabilidade(a)
  const issueDate      = toDateOnly(a.extra?.issueDate)
  const maturityDate   = toDateOnly(a.maturityDate)

  const acquisitions              = a.extra?.acquisitions ?? []
  const earlyTerminationSchedules = a.extra?.earlyTerminationSchedules ?? []

  const dbRow = {
    ativo_canonico_id:   ativoCanonicoId,
    asset_class:         a.assetClass,
    tipo:                tipoLabel,
    sub_tipo:            subTipo || null,
    emissor,
    ticker:              ticker || null,
    codigo:              codigo || null,
    security_code:       a.extra?.securityCode ?? null,
    isin:                a.extra?.isin ?? null,
    cetip_code:          a.extra?.cetipCode ?? null,
    selic_code:          a.extra?.selicCode ?? null,
    issuer_cge_code:     a.extra?.issuerCgeCode ?? null,
    issuer_type:         a.extra?.issuerType ?? null,
    issue_date:          issueDate,
    maturity_date:       maturityDate,
    tax_free:            a.extra?.taxFree ?? false,
    is_repo:             a.extra?.isRepo ?? false,
    is_liquidity:        a.isLiquidity ?? false,
    valor_bruto:         a.grossValue ?? null,
    valor_liquido:       a.netValue ?? a.grossValue ?? null,
    ir:                  a.incomeTax ?? null,
    iof_tax:             a.extra?.iofTax ?? null,
    price_income_tax:    a.extra?.priceIncomeTax ?? null,
    price_virtual_iof:   a.extra?.priceVirtualIOF ?? null,
    quantidade:          a.quantity ?? null,
    preco_mercado:       a.marketPrice ?? null,
    rentabilidade,
    benchmark:           a.benchMark ?? null,
    yield_avg:           a.extra?.yieldAvg ?? null,
    fund_manager:        a.extra?.manager ?? null,
    fund_cnpj:           a.extra?.cnpj ?? null,
    fund_liquidity_days: a.extra?.fundLiquidity ?? null,
    sector_description:  a.extra?.sector ?? null,
    is_fii:              a.extra?.isFII === 'true' || a.extra?.isFII === true,
  }

  const frontRow = {
    tipo:          tipoLabel,
    subTipo:       subTipo || null,
    emissor,
    codigo:        codigo || null,
    ticker:        ticker || null,
    valorBruto:    a.grossValue ?? 0,
    valorLiquido:  a.netValue ?? a.grossValue ?? 0,
    ir:            a.incomeTax ?? null,
    quantidade:    a.quantity ?? null,
    precoMercado:  a.marketPrice ?? null,
    rentabilidade,
    benchmark:     a.benchMark ?? null,
    vencimento:    a.maturityDate ?? null,
    extra: {
      isin:            a.extra?.isin ?? null,
      cetipCode:       a.extra?.cetipCode ?? null,
      selicCode:       a.extra?.selicCode ?? null,
      issuer,
      issuerCgeCode:   a.extra?.issuerCgeCode ?? null,
      issueDate:       a.extra?.issueDate ?? null,
      issuerType:      a.extra?.issuerType ?? null,
      taxFree:         a.extra?.taxFree ?? false,
      isRepo:          a.extra?.isRepo ?? false,
      isLiquidity:     a.isLiquidity ?? false,
      yieldAvg:        a.extra?.yieldAvg ?? null,
      iofTax:          a.extra?.iofTax ?? null,
      priceIncomeTax:  a.extra?.priceIncomeTax ?? null,
      priceVirtualIOF: a.extra?.priceVirtualIOF ?? null,
      manager:         a.extra?.manager ?? null,
      cnpj:            a.extra?.cnpj ?? null,
      fundLiquidity:   a.extra?.fundLiquidity ?? null,
      acquisitions,
      earlyTerminationSchedules,
    },
  }

  return { dbRow, frontRow, acquisitions, earlyTerminationSchedules }
}

// ─────────────────────────────────────────────────────────────────────────────
// Totais e helpers
// ─────────────────────────────────────────────────────────────────────────────

function calcularTotais(assets: UnifiedAsset[]) {
  const t = {
    patrimonio_total: 0,
    saldo_cc: 0, saldo_rf: 0, saldo_fundos: 0, saldo_rv: 0,
    saldo_prev: 0, saldo_cripto: 0, saldo_outros: 0,
  }

  for (const a of assets) {
    const v = a.grossValue ?? 0
    t.patrimonio_total += v
    switch (a.assetClass) {
      case 'CASH':            t.saldo_cc     += v; break
      case 'FIXED_INCOME':    t.saldo_rf     += v; break
      case 'INVESTMENT_FUND': t.saldo_fundos += v; break
      case 'EQUITIES':        t.saldo_rv     += v; break
      case 'PENSION':         t.saldo_prev   += v; break
      case 'CRYPTO':          t.saldo_cripto += v; break
      default:                t.saldo_outros += v
    }
  }
  return t
}

function parsearTicker(ticker: string, assetClass: string): { subTipo: string; codigo: string } {
  if (!ticker) return { subTipo: mapSubTipoPadrao(assetClass), codigo: '' }
  const match = ticker.match(/^([A-Z]+)-(.+)$/)
  if (match) return { subTipo: match[1], codigo: match[2] }
  return { subTipo: ticker, codigo: '' }
}

function formatRentabilidade(a: UnifiedAsset): string | null {
  const indexRate = a.indexRate ?? ''
  const benchMark = a.benchMark ?? ''
  if (indexRate && indexRate !== 'PRE' && indexRate !== benchMark) return indexRate
  if (benchMark === 'PRE' || indexRate === 'PRE') return 'PRE'
  return benchMark || null
}
