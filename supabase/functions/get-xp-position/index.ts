import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { classifyAvere, suggestLiquidezAvere } from '../_shared/classifyAvere.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-xp-position
// Deploy: supabase functions deploy get-xp-position --no-verify-jwt
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

    // ── Parâmetros ────────────────────────────────────────────────────────────
    const url = new URL(req.url)
    let accountNumber = url.searchParams.get('account')
    let clientId      = url.searchParams.get('clientId')

    if (req.method === 'POST') {
      const body    = await req.json()
      accountNumber = accountNumber ?? body.account
      clientId      = clientId      ?? body.clientId
    }

    if (!accountNumber) return errorResponse('Parâmetro "account" é obrigatório', 400)

    console.log(`Buscando posição XP para conta ${accountNumber}...`)

    // ── Chamar o consolidador ─────────────────────────────────────────────────
    const consolidatorRes = await fetch(
      `${CONSOLIDATOR_URL}/api/v1/position/xp/${accountNumber}`,
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (!consolidatorRes.ok) {
      const err = await consolidatorRes.json().catch(() => ({}))
      return errorResponse(
        err?.error?.message ?? `Erro no consolidador XP: ${consolidatorRes.status}`,
        consolidatorRes.status
      )
    }

    const { data: position } = await consolidatorRes.json()
    if (!position) return errorResponse('Nenhum dado retornado pelo consolidador XP', 502)

    const assets: any[] = position.assets ?? []
    const today = new Date().toISOString().split('T')[0]

    // ── Normalizar ativos ─────────────────────────────────────────────────────
    const parsed = assets.map((a: any) => parseAtivo(a))

    // ── Calcular totais ───────────────────────────────────────────────────────
    const totais = calcularTotais(assets)

    // ── Persistir no Supabase ─────────────────────────────────────────────────
    if (clientId) {
      const { data: snapshot, error: snapError } = await supabase
        .from('posicao_xp_snapshots')
        .upsert({
          cliente_id:              clientId,
          data_referencia:         today,
          patrimonio_total:        totais.patrimonio_total,
          patrimonio_total_liquido: totais.patrimonio_total_liquido,
          valor_disponivel:        totais.saldo_cc,
          saldo_acoes:             totais.saldo_rv,
          saldo_fundos:            totais.saldo_fundos,
          saldo_renda_fixa:        totais.saldo_rf,
          saldo_tesouro_direto:    totais.saldo_td,
          saldo_previdencia:       totais.saldo_prev,
          saldo_coe:               totais.saldo_coe,
          saldo_fii:               totais.saldo_fii,
          saldo_outros:            totais.saldo_outros,
          is_month_end:            false,
          source:                  'XP_DATA_ACCESS_V1',
          dado_atualizado:         true,
        }, { onConflict: 'cliente_id,data_referencia' })
        .select('id')
        .single()

      if (snapError || !snapshot) {
        console.error('Erro ao salvar snapshot XP:', snapError?.message)
      } else {
        console.log(`Snapshot XP salvo — R$ ${totais.patrimonio_total.toFixed(2)}`)

        await supabase.from('posicao_xp_ativos').delete().eq('snapshot_id', snapshot.id)

        if (parsed.length > 0) {
          const bulk = parsed.map(({ dbRow }) => ({ snapshot_id: snapshot.id, ...dbRow }))
          const { error: insError } = await supabase.from('posicao_xp_ativos').insert(bulk)
          if (insError) console.error('Erro ao salvar ativos XP:', insError.message)
          else console.log(`${parsed.length} ativos XP persistidos`)
        }
      }
    } else {
      console.warn('clientId não informado — snapshot não salvo')
    }

    // ── Popular dicionário ────────────────────────────────────────────────────
    await upsertDicionario(supabase, assets)

    // ── Alocação para o front ─────────────────────────────────────────────────
    const alocacao = [
      { classe: 'Conta Corrente',         valor: totais.saldo_cc      },
      { classe: 'Renda Fixa',             valor: totais.saldo_rf      },
      { classe: 'Tesouro Direto',         valor: totais.saldo_td      },
      { classe: 'Fundos de Investimento', valor: totais.saldo_fundos  },
      { classe: 'Renda Variável',         valor: totais.saldo_rv      },
      { classe: 'FII',                    valor: totais.saldo_fii     },
      { classe: 'Previdência',            valor: totais.saldo_prev    },
      { classe: 'COE',                    valor: totais.saldo_coe     },
      { classe: 'Outros',                 valor: totais.saldo_outros  },
    ].filter(a => a.valor > 0)

    return new Response(
      JSON.stringify({
        patrimonioTotal:        totais.patrimonio_total,
        patrimonioTotalLiquido: totais.patrimonio_total_liquido,
        dataReferencia:         today,
        alocacao,
        ativos: parsed.map(({ frontRow }) => frontRow),
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Erro na Edge Function XP:', err.message)
    return errorResponse(err.message ?? 'Erro interno', 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// parseAtivo — mapeia UnifiedAsset → dbRow (colunas existentes no banco) + frontRow
// ─────────────────────────────────────────────────────────────────────────────

function parseAtivo(a: any) {
  const tipoLabel = mapTipoLabel(a.assetClass)
  const subTipo   = resolverSubTipo(a)

  // ── dbRow: usa os nomes de coluna exatos da posicao_xp_ativos ────────────
  const dbRow = {
    asset_class:         a.assetClass,
    tipo:                tipoLabel,
    sub_tipo:            subTipo                || null,
    nome:                a.name                 || null,
    ticker:              a.ticker               || null,
    isin:                a.extra?.isin          || null,
    codigo_ativo:        a.securityCode         || a.ticker || null,
    emissor:             a.name                 || null,
    cnpj:                a.extra?.cnpj          || null,
    quantidade:          a.quantity             ?? null,
    preco_unitario:      a.marketPrice          ?? null,
    valor_bruto:         a.grossValue           ?? 0,
    valor_liquido:       a.netValue             ?? a.grossValue ?? 0,
    valor_imposto_renda: a.incomeTax            ?? null,
    benchmark:           a.benchMark            || null,
    indexador:           a.benchMark            || null,
    data_vencimento:     a.maturityDate ? String(a.maturityDate).split('T')[0] : null,
    is_liquidity:        a.isLiquidity          ?? false,
    is_isento_ir:        a.extra?.taxFree       ?? false,
  }

  const frontRow = {
    tipo:         tipoLabel,
    subTipo:      subTipo || null,
    emissor:      a.name  || null,
    ticker:       a.ticker || null,
    quantidade:   a.quantity    ?? null,
    valorBruto:   a.grossValue  ?? 0,
    valorLiquido: a.netValue    ?? a.grossValue ?? 0,
    ir:           a.incomeTax   ?? null,
    benchmark:    a.benchMark   || null,
    vencimento:   a.maturityDate || null,
    isLiquidity:  a.isLiquidity  ?? false,
    extra: {
      productType:     a.extra?.productType     || null,
      productCategory: a.extra?.productCategory || null,
      advisor:         a.extra?.advisor         || null,
      office:          a.extra?.office          || null,
    },
  }

  return { dbRow, frontRow }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calcularTotais(assets: any[]) {
  const sum = (cls: string) =>
    assets.filter(a => a.assetClass === cls).reduce((s, a) => s + (a.grossValue ?? 0), 0)

  const sumBySubTipo = (cls: string, sub: string) =>
    assets.filter(a => a.assetClass === cls && (resolverSubTipo(a) === sub || (a.name ?? '').toUpperCase().includes(sub)))
          .reduce((s, a) => s + (a.grossValue ?? 0), 0)

  const totalBruto  = assets.reduce((s, a) => s + (a.grossValue ?? 0), 0)
  const totalLiquid = assets.reduce((s, a) => s + (a.netValue ?? a.grossValue ?? 0), 0)

  const rv    = sum('EQUITIES')
  const rvFii = assets.filter(a => a.assetClass === 'EQUITIES' && (a.extra?.isFII || (a.name ?? '').toUpperCase().includes('FII')))
                       .reduce((s, a) => s + (a.grossValue ?? 0), 0)

  return {
    patrimonio_total:        totalBruto,
    patrimonio_total_liquido: totalLiquid,
    saldo_cc:      sum('CASH'),
    saldo_rf:      sum('FIXED_INCOME'),
    saldo_td:      assets.filter(a => a.assetClass === 'FIXED_INCOME' && (a.name ?? '').toUpperCase().includes('TESOURO'))
                         .reduce((s, a) => s + (a.grossValue ?? 0), 0),
    saldo_rv:      rv - rvFii,
    saldo_fii:     rvFii,
    saldo_fundos:  sum('INVESTMENT_FUND'),
    saldo_prev:    sum('PENSION'),
    saldo_coe:     assets.filter(a => a.assetClass === 'DERIVATIVE' && (a.name ?? '').toUpperCase().includes('COE'))
                         .reduce((s, a) => s + (a.grossValue ?? 0), 0),
    saldo_cripto:  sum('CRYPTO'),
    saldo_outros:  assets
      .filter(a => !['CASH','FIXED_INCOME','EQUITIES','INVESTMENT_FUND','PENSION','CRYPTO'].includes(a.assetClass))
      .reduce((s, a) => s + (a.grossValue ?? 0), 0),
  }
}

function resolverSubTipo(a: any): string {
  const type = (a.extra?.productType ?? a.extra?.productCategory ?? '').toLowerCase()
  if (!type) return mapSubTipoPadrao(a.assetClass)
  if (type.includes('cdb'))                                       return 'CDB'
  if (type.includes('lci'))                                       return 'LCI'
  if (type.includes('lca'))                                       return 'LCA'
  if (type.includes('cra'))                                       return 'CRA'
  if (type.includes('cri'))                                       return 'CRI'
  if (type.includes('debenture') || type.includes('debênture'))   return 'DEB'
  if (type.includes('tesouro'))                                   return 'TD'
  if (type.includes('fii'))                                       return 'FII'
  if (type.includes('fundo') || type.includes('fund'))            return 'FI'
  return mapSubTipoPadrao(a.assetClass)
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
    CASH:            'CC',
  }
  return map[assetClass] ?? ''
}

// ─────────────────────────────────────────────────────────────────────────────
// upsertDicionario
// ─────────────────────────────────────────────────────────────────────────────

async function upsertDicionario(supabase: any, assets: any[]) {
  const seen  = new Set<string>()
  const rows: any[] = []

  for (const a of assets) {
    let codigo: string | null = null
    let tipo = 'TICKER'

    if (a.extra?.isin)       { codigo = a.extra.isin;   tipo = 'ISIN'   }
    else if (a.securityCode) { codigo = a.securityCode; tipo = 'TICKER' }
    else if (a.ticker)       { codigo = a.ticker;       tipo = 'TICKER' }

    if (!codigo) continue
    if (seen.has(codigo)) continue
    seen.add(codigo)

    rows.push({
      codigo_identificador: codigo,
      tipo_identificador:   tipo,
      nome_ativo:           a.name || codigo,
      benchmark:            a.benchMark || null,
      instituicao_origem:   'XP',
      classe_original:      mapTipoLabel(a.assetClass),
      data_vencimento:      a.maturityDate ? String(a.maturityDate).split('T')[0] : null,
      classe_avere: classifyAvere({
        assetClass:  a.assetClass,
        institution: 'XP',
        maturityDate: a.maturityDate ?? null,
        isLiquidity:  a.isLiquidity  ?? false,
        benchMark:    a.benchMark    ?? null,
        name:         a.name         ?? null,
      }),
      liquidez_avere: suggestLiquidezAvere({
        assetClass:  a.assetClass,
        institution: 'XP',
        maturityDate: a.maturityDate ?? null,
        isLiquidity:  a.isLiquidity  ?? false,
      }),
    })
  }

  if (rows.length === 0) return

  const { error } = await supabase
    .from('dicionario_ativos')
    .upsert(rows, {
      onConflict:       'codigo_identificador,tipo_identificador',
      ignoreDuplicates: true,
    })

  if (error) console.error('Erro ao popular dicionário XP:', error.message)
  else console.log(`Dicionário XP: upsert de ${rows.length} ativo(s) concluído`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: { message } }),
    { status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
  )
}
