import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-btg-position
// Deploy: supabase functions deploy get-btg-position --no-verify-jwt
// ─────────────────────────────────────────────────────────────────────────────

const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL') ?? 'http://localhost:3333'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── Pegar accountNumber ────────────────────────────────────────────────
    const url = new URL(req.url)
    let accountNumber = url.searchParams.get('account')
    if (!accountNumber && req.method === 'POST') {
      const body = await req.json()
      accountNumber = body.account
    }
    if (!accountNumber) return errorResponse('Parâmetro "account" é obrigatório', 400)

    // ── Chamar o consolidador ──────────────────────────────────────────────
    console.log(`Buscando posição BTG para conta ${accountNumber}...`)

    const consolidatorRes = await fetch(
      `${CONSOLIDATOR_URL}/api/v1/position/btg/${accountNumber}`,
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (!consolidatorRes.ok) {
      const err = await consolidatorRes.json()
      return errorResponse(err?.error?.message ?? 'Erro no consolidador', consolidatorRes.status)
    }

    const { data: position } = await consolidatorRes.json()
    if (!position) return errorResponse('Nenhum dado retornado pelo consolidador', 502)

    const assets: any[] = position.assets ?? []
    const today = new Date().toISOString().split('T')[0]

    // ── Normalizar ativos em dois formatos ─────────────────────────────────
    // dbRows   → snake_case, para persistência no Supabase
    // frontRows → camelCase, para retorno ao BtgApi.tsx
    const parsed = assets.map((a: any) => parseAtivo(a))

    // ── Calcular totais ────────────────────────────────────────────────────
    const totais = calcularTotais(assets)

    // ── Alocação para o front ──────────────────────────────────────────────
    const alocacao = [
      { classe: 'Conta Corrente',         valor: totais.saldo_cc },
      { classe: 'Renda Fixa',             valor: totais.saldo_rf },
      { classe: 'Fundos de Investimento', valor: totais.saldo_fundos },
    ]

    // ── Persistir no Supabase ──────────────────────────────────────────────
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('codigo_btg', accountNumber)
      .single()

    if (cliente) {
      // 1. Upsert snapshot diário
      const { data: snapshot, error: snapError } = await supabase
        .from('posicao_btg_snapshots')
        .upsert({
          cliente_id:       cliente.id,
          data_referencia:  today,
          patrimonio_total: totais.patrimonio_total,
          saldo_cc:         totais.saldo_cc,
          saldo_rf:         totais.saldo_rf,
          saldo_fundos:     totais.saldo_fundos,
          saldo_rv:         totais.saldo_rv,
          saldo_prev:       totais.saldo_prev,
          saldo_cripto:     totais.saldo_cripto,
          saldo_outros:     totais.saldo_outros,
          is_month_end:     false,
          source:           'BTG_IAAS_V1',
        }, { onConflict: 'cliente_id,data_referencia' })
        .select('id')
        .single()

      if (snapError || !snapshot) {
        console.error('Erro ao salvar snapshot:', snapError?.message)
      } else {
        console.log(`Snapshot salvo — R$ ${totais.patrimonio_total.toFixed(2)}`)

        // 2. Deletar ativos anteriores (cascade apaga aquisições e janelas)
        await supabase
          .from('posicao_btg_ativos')
          .delete()
          .eq('snapshot_id', snapshot.id)

        // 3. Inserir cada ativo e seus filhos
        for (const { dbRow, acquisitions, earlyTerminationSchedules } of parsed) {
          const { data: ativoSalvo, error: ativoError } = await supabase
            .from('posicao_btg_ativos')
            .insert({ snapshot_id: snapshot.id, ...dbRow })
            .select('id')
            .single()

          if (ativoError || !ativoSalvo) {
            console.error('Erro ao salvar ativo:', ativoError?.message)
            continue
          }

          // 4. Aquisições
          if (acquisitions.length > 0) {
            const bulk = acquisitions.map((acq: any) => ({
              ativo_id:                 ativoSalvo.id,
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
            }))
            const { error: acqError } = await supabase
              .from('posicao_btg_aquisicoes')
              .insert(bulk)
            if (acqError) console.error('Erro aquisições:', acqError.message)
          }

          // 5. Janelas de liquidez
          if (earlyTerminationSchedules.length > 0) {
            const bulk = earlyTerminationSchedules.map((s: any) => ({
              ativo_id:              ativoSalvo.id,
              type:                  s.type ?? null,
              index_rate_multiplier: s.indexRateMultiplier ?? null,
              rate:                  s.rate ?? null,
              from_date:             s.fromDate ?? null,
              to_date:               s.toDate ?? null,
            }))
            const { error: janelaError } = await supabase
              .from('posicao_btg_janelas_liquidez')
              .insert(bulk)
            if (janelaError) console.error('Erro janelas:', janelaError.message)
          }
        }

        console.log(`${parsed.length} ativos persistidos`)
      }
    } else {
      console.warn(`Cliente não encontrado para conta BTG ${accountNumber}`)
    }

    // ── Retornar ao front em camelCase (formato BtgApi.tsx) ────────────────
    const ativos = parsed.map(({ frontRow }) => frontRow)

    return new Response(
      JSON.stringify({ patrimonioTotal: totais.patrimonio_total, dataReferencia: today, alocacao, ativos }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Erro na Edge Function:', err.message)
    return errorResponse(err.message ?? 'Erro interno', 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// parseAtivo — retorna três coisas separadas:
//   dbRow                  → snake_case para posicao_btg_ativos
//   frontRow               → camelCase para o BtgApi.tsx
//   acquisitions           → array para posicao_btg_aquisicoes
//   earlyTerminationSchedules → array para posicao_btg_janelas_liquidez
// ─────────────────────────────────────────────────────────────────────────────

function parseAtivo(a: any) {
  const ticker: string  = a.ticker ?? ''
  const issuer: string  = a.extra?.issuer ?? ''
  const { subTipo, codigo } = parsearTicker(ticker, a.assetClass)
  const emissor             = issuer || a.name || ''
  const tipoLabel           = mapTipoLabel(a.assetClass)
  const rentabilidade       = formatRentabilidade(a)
  const issueDate           = a.extra?.issueDate ? toDateOnly(a.extra.issueDate) : null
  const maturityDate        = a.maturityDate ? toDateOnly(a.maturityDate) : null

  const acquisitions              = a.extra?.acquisitions ?? []
  const earlyTerminationSchedules = a.extra?.earlyTerminationSchedules ?? []

  // ── Linha para a tabela posicao_btg_ativos (snake_case) ───────────────────
  const dbRow = {
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

  // ── Objeto para o BtgApi.tsx (camelCase) ──────────────────────────────────
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
      isin:                      a.extra?.isin ?? null,
      cetipCode:                 a.extra?.cetipCode ?? null,
      selicCode:                 a.extra?.selicCode ?? null,
      issuer,
      issuerCgeCode:             a.extra?.issuerCgeCode ?? null,
      issueDate:                 a.extra?.issueDate ?? null,
      issuerType:                a.extra?.issuerType ?? null,
      taxFree:                   a.extra?.taxFree ?? false,
      isRepo:                    a.extra?.isRepo ?? false,
      isLiquidity:               a.isLiquidity ?? false,
      yieldAvg:                  a.extra?.yieldAvg ?? null,
      iofTax:                    a.extra?.iofTax ?? null,
      priceIncomeTax:            a.extra?.priceIncomeTax ?? null,
      priceVirtualIOF:           a.extra?.priceVirtualIOF ?? null,
      manager:                   a.extra?.manager ?? null,
      cnpj:                      a.extra?.cnpj ?? null,
      fundLiquidity:             a.extra?.fundLiquidity ?? null,
      acquisitions,
      earlyTerminationSchedules,
    },
  }

  return { dbRow, frontRow, acquisitions, earlyTerminationSchedules }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calcularTotais(assets: any[]) {
  const sum = (cls: string) =>
    assets.filter(a => a.assetClass === cls).reduce((s, a) => s + (a.grossValue ?? 0), 0)

  return {
    patrimonio_total: assets.reduce((s, a) => s + (a.grossValue ?? 0), 0),
    saldo_cc:         sum('CASH'),
    saldo_rf:         sum('FIXED_INCOME'),
    saldo_fundos:     sum('INVESTMENT_FUND'),
    saldo_rv:         sum('EQUITIES'),
    saldo_prev:       sum('PENSION'),
    saldo_cripto:     sum('CRYPTO'),
    saldo_outros:     assets
      .filter(a => !['CASH','FIXED_INCOME','INVESTMENT_FUND','EQUITIES','PENSION','CRYPTO'].includes(a.assetClass))
      .reduce((s, a) => s + (a.grossValue ?? 0), 0),
  }
}

function parsearTicker(ticker: string, assetClass: string): { subTipo: string; codigo: string } {
  if (!ticker) return { subTipo: mapSubTipoPadrao(assetClass), codigo: '' }
  const match = ticker.match(/^([A-Z]+)-(.+)$/)
  if (match) return { subTipo: match[1], codigo: match[2] }
  return { subTipo: ticker, codigo: '' }
}

function toDateOnly(dateStr: string): string | null {
  if (!dateStr) return null
  try { return new Date(dateStr).toISOString().split('T')[0] } catch { return null }
}

function formatRentabilidade(a: any): string | null {
  const indexRate: string = a.indexRate ?? ''
  const benchMark: string = a.benchMark ?? ''
  if (indexRate && indexRate !== 'PRE' && indexRate !== benchMark) return indexRate
  if (benchMark === 'PRE' || indexRate === 'PRE') return 'PRE'
  return benchMark || null
}

function mapTipoLabel(assetClass: string): string {
  const map: Record<string, string> = {
    FIXED_INCOME:    'Renda Fixa',
    INVESTMENT_FUND: 'Fundos de Investimento',
    EQUITIES:        'Renda Variável',
    PENSION:         'Previdência',
    CRYPTO:          'Criptomoedas',
    DERIVATIVE:      'Derivativos',
    COMMODITY:       'Commodities',
    CASH:            'Conta Corrente',
    OTHER:           'Outros',
  }
  return map[assetClass] ?? assetClass
}

function mapSubTipoPadrao(assetClass: string): string {
  const map: Record<string, string> = {
    INVESTMENT_FUND: 'FI',
    EQUITIES:        'AÇÃO',
    PENSION:         'PREV',
    CRYPTO:          'CRYPTO',
    DERIVATIVE:      'DERIV',
    COMMODITY:       'COMOD',
    CASH:            'CC',
  }
  return map[assetClass] ?? ''
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: { message } }),
    { status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
  )
}