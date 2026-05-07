import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-avenue-position
// Deploy: supabase functions deploy get-avenue-position --no-verify-jwt
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL')

  try {
    if (!CONSOLIDATOR_URL) {
      throw new Error('🚨 CONSOLIDATOR_URL não está configurada no Supabase Secrets!')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { clientId } = await req.json()
    if (!clientId) throw new Error('clientId não enviado')

    const { data: cliente } = await supabase
      .from('clientes')
      .select('id, codigo_avenue')
      .eq('id', clientId)
      .single()

    if (!cliente?.codigo_avenue) throw new Error('Código Avenue não encontrado no banco')

    // Avenue fecha custódia com alguns dias de delay
    const dateObj = new Date()
    dateObj.setDate(dateObj.getDate() - 4)
    const targetDate = dateObj.toISOString().split('T')[0]

    const fetchUrl = `${CONSOLIDATOR_URL}/api/v1/avenue/auc?date=${targetDate}&cpf=${cliente.codigo_avenue}`

    let response
    try {
      response = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (networkError: any) {
      throw new Error(`🔥 Falha de Rede! Tentei acessar [${fetchUrl}]. Detalhe: ${networkError.message}`)
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}))
      throw new Error(errBody?.message ?? `Erro na API Avenue: status ${response.status}`)
    }

    const rawJson = await response.json()
    const aucData: any[] = Array.isArray(rawJson.data) ? rawJson.data : []

    console.log(`Avenue: ${aucData.length} ativos encontrados para ${targetDate}`)

    // ── Parsear cada ativo ─────────────────────────────────────────────────────
    const parsed = aucData.map((item) => parseAtivoAvenue(item))

    // ── Totais ─────────────────────────────────────────────────────────────────
    const totais = calcularTotais(parsed)

    // ── Alocação para o front (apenas classes com saldo) ──────────────────────
    const alocacao = [
      { classe: 'Caixa (USD)',   valor: totais.saldo_caixa  },
      { classe: 'Renda Variável', valor: totais.saldo_rv    },
      { classe: 'Renda Fixa',    valor: totais.saldo_rf     },
      { classe: 'Fundos',        valor: totais.saldo_fundos },
      { classe: 'Criptomoedas',  valor: totais.saldo_cripto },
      { classe: 'Outros',        valor: totais.saldo_outros },
    ].filter((a) => a.valor > 0)

    // ── Persistir no Supabase ──────────────────────────────────────────────────
    const { data: snapshot, error: snapError } = await supabase
      .from('posicao_avenue_snapshots')
      .upsert({
        cliente_id:       clientId,
        data_referencia:  targetDate,
        patrimonio_total: totais.patrimonio_total,
        patrimonio_usd:   totais.patrimonio_usd,
        saldo_caixa:      totais.saldo_caixa,
        saldo_rf:         totais.saldo_rf,
        saldo_rv:         totais.saldo_rv,
        saldo_fundos:     totais.saldo_fundos,
        saldo_cripto:     totais.saldo_cripto,
        saldo_outros:     totais.saldo_outros,
        source:           'AVENUE_LOOKER_V4',
      }, { onConflict: 'cliente_id,data_referencia' })
      .select('id')
      .single()

    if (snapError || !snapshot) {
      console.error('Erro ao salvar snapshot Avenue:', snapError?.message)
    } else {
      console.log(`Snapshot Avenue salvo — R$ ${totais.patrimonio_total.toFixed(2)} / USD ${totais.patrimonio_usd.toFixed(2)}`)

      // Deletar ativos anteriores do snapshot (garante idempotência)
      await supabase
        .from('posicao_avenue_ativos')
        .delete()
        .eq('snapshot_id', snapshot.id)

      // Inserir ativos em bulk
      if (parsed.length > 0) {
        const bulk = parsed.map(({ dbRow }) => ({ snapshot_id: snapshot.id, ...dbRow }))
        const { error: ativosError } = await supabase
          .from('posicao_avenue_ativos')
          .insert(bulk)

        if (ativosError) {
          console.error('Erro ao salvar ativos Avenue:', ativosError.message)
        } else {
          console.log(`${parsed.length} ativos Avenue persistidos`)
        }
      }
    }

    // ── Retornar ao front ──────────────────────────────────────────────────────
    const ativos = parsed.map(({ frontRow }) => frontRow)

    return new Response(
      JSON.stringify({
        patrimonioTotal:    totais.patrimonio_total,
        patrimonioTotalUsd: totais.patrimonio_usd,
        dataReferencia:     targetDate,
        alocacao,
        ativos,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Erro na Edge Function get-avenue-position:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// parseAtivoAvenue — retorna dbRow (snake_case) e frontRow (camelCase)
// ─────────────────────────────────────────────────────────────────────────────

function parseAtivoAvenue(item: any) {
  const assetClass = classificarProductType(item.productType ?? '')
  const tipoLabel  = mapTipoLabel(assetClass)
  const isLiquidity = (item.productType ?? '').includes('Balance')

  const dbRow = {
    asset_class:      assetClass,
    tipo:             tipoLabel,
    product_type:     item.productType   ?? null,
    nome:             item.productName   ?? null,
    ticker:           item.productSymbol || null,
    cusip:            item.productCusip  || null,
    isin:             item.isin          || null,
    quantidade:       item.quantity      ?? null,
    valor_bruto_brl:  item.aucBrl        ?? 0,
    valor_bruto_usd:  item.aucUsd        ?? 0,
    maturity_date:    item.maturityDate  || null,
    is_liquidity:     isLiquidity,
    office_name:      item.officeName    || null,
  }

  const frontRow = {
    tipo:        tipoLabel,
    productType: item.productType  ?? null,
    nome:        item.productName  ?? null,
    ticker:      item.productSymbol || null,
    cusip:       item.productCusip  || null,
    isin:        item.isin          || null,
    quantidade:  item.quantity      ?? null,
    valorBrl:    item.aucBrl        ?? 0,
    valorUsd:    item.aucUsd        ?? 0,
    vencimento:  item.maturityDate  || null,
    isLiquidity,
    officeName:  item.officeName    || null,
  }

  return { dbRow, frontRow }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calcularTotais(parsed: ReturnType<typeof parseAtivoAvenue>[]) {
  let patrimonio_total = 0
  let patrimonio_usd   = 0
  let saldo_caixa      = 0
  let saldo_rf         = 0
  let saldo_rv         = 0
  let saldo_fundos     = 0
  let saldo_cripto     = 0
  let saldo_outros     = 0

  for (const { dbRow } of parsed) {
    const brl = dbRow.valor_bruto_brl ?? 0
    const usd = dbRow.valor_bruto_usd ?? 0
    patrimonio_total += brl
    patrimonio_usd   += usd

    switch (dbRow.asset_class) {
      case 'CASH':            saldo_caixa  += brl; break
      case 'FIXED_INCOME':    saldo_rf     += brl; break
      case 'EQUITIES':        saldo_rv     += brl; break
      case 'INVESTMENT_FUND': saldo_fundos += brl; break
      case 'CRYPTO':          saldo_cripto += brl; break
      default:                saldo_outros += brl
    }
  }

  return {
    patrimonio_total,
    patrimonio_usd,
    saldo_caixa,
    saldo_rf,
    saldo_rv,
    saldo_fundos,
    saldo_cripto,
    saldo_outros,
  }
}

function classificarProductType(productType: string): string {
  const map: Record<string, string> = {
    'Balance US Banking':  'CASH',
    'Balance US Clearing': 'CASH',
    'Funds':               'INVESTMENT_FUND',
    'Stocks':              'EQUITIES',
    'Bonds':               'FIXED_INCOME',
    'ETFs':                'EQUITIES',
    'Crypto':              'CRYPTO',
  }
  return map[productType] ?? 'OTHER'
}

function mapTipoLabel(assetClass: string): string {
  const map: Record<string, string> = {
    FIXED_INCOME:    'Renda Fixa',
    INVESTMENT_FUND: 'Fundos',
    EQUITIES:        'Renda Variável',
    CASH:            'Caixa (USD)',
    CRYPTO:          'Criptomoedas',
    OTHER:           'Outros',
  }
  return map[assetClass] ?? assetClass
}