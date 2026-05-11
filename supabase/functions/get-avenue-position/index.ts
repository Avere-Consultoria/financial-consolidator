import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-avenue-position
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
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    if (!CONSOLIDATOR_URL) throw new Error('🚨 CONSOLIDATOR_URL não configurada!')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { clientId } = await req.json()
    if (!clientId) throw new Error('clientId não enviado')

    // 1. Busca dados do cliente para obter o CPF (codigo_avenue)
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id, codigo_avenue')
      .eq('id', clientId)
      .single()

    if (!cliente?.codigo_avenue) throw new Error('Código Avenue (CPF) não encontrado no banco')

    // 2. Define data de referência (4 dias atrás para garantir custódia fechada)
    const dateObj = new Date()
    dateObj.setDate(dateObj.getDate() - 4)
    const targetDate = dateObj.toISOString().split('T')[0]

    // 3. Chamada à API do Consolidador
    const fetchUrl = `${CONSOLIDATOR_URL}/api/v1/avenue/auc?date=${targetDate}&cpf=${cliente.codigo_avenue}`
    
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Erro na API Avenue: status ${response.status}`)
    }

    const rawJson = await response.json()
    
    // Ajuste para lidar com diferentes formatos de retorno (array direto ou dentro de .data)
    const aucData: any[] = Array.isArray(rawJson) ? rawJson : (Array.isArray(rawJson.data) ? rawJson.data : [])

    console.log(`Recebidos ${aucData.length} ativos totais da API.`)

    // 4. FILTRO DE SEGURANÇA: Filtra apenas os ativos do CPF solicitado
    const filteredData = aucData.filter(item => item["auc.client_cpf"] === cliente.codigo_avenue)
    
    console.log(`Processando ${filteredData.length} ativos para o CPF ${cliente.codigo_avenue}`)

    // 5. Parsear ativos
    const parsed = filteredData.map((item) => parseAtivoAvenue(item))

    // 6. Calcular Totais para o Snapshot
    const totais = calcularTotais(parsed)

    // 7. Salvar Snapshot no Supabase
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
        source:           'AVENUE_CONSOLIDATOR_V1',
      }, { onConflict: 'cliente_id,data_referencia' })
      .select('id')
      .single()

    if (snapError || !snapshot) throw snapError || new Error('Falha ao gerar snapshot')

    // 8. Limpar e Inserir novos ativos vinculados ao Snapshot
    await supabase.from('posicao_avenue_ativos').delete().eq('snapshot_id', snapshot.id)

    if (parsed.length > 0) {
      const bulkAtivos = parsed.map(({ dbRow }) => ({ snapshot_id: snapshot.id, ...dbRow }))
      const { error: insError } = await supabase.from('posicao_avenue_ativos').insert(bulkAtivos)
      if (insError) console.error('Erro ao salvar ativos:', insError.message)
    }

    // 9. Retorno para o Front-end (formatado conforme padrão BTG)
    return new Response(
      JSON.stringify({
        patrimonioTotal:    totais.patrimonio_total,
        patrimonioTotalUsd: totais.patrimonio_usd,
        dataReferencia:     targetDate,
        alocacao: [
          { classe: 'Caixa (USD)',   valor: totais.saldo_caixa  },
          { classe: 'Renda Variável', valor: totais.saldo_rv     },
          { classe: 'Renda Fixa',    valor: totais.saldo_rf      },
          { classe: 'Fundos',        valor: totais.saldo_fundos  },
          { classe: 'Criptomoedas',  valor: totais.saldo_cripto  },
          { classe: 'Outros',        valor: totais.saldo_outros  },
        ].filter(a => a.valor > 0),
        ativos: parsed.map(p => p.frontRow),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('ERRO:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Funções Auxiliares
// ─────────────────────────────────────────────────────────────────────────────

function parseAtivoAvenue(item: any) {
  const productType = item["auc.product_type"] || ''
  const assetClass = classificarProductType(productType)
  const tipoLabel  = mapTipoLabel(assetClass)
  const isLiquidity = productType.includes('Balance')

  // Mapeamento para o Banco de Dados (snake_case)
  const dbRow = {
    asset_class:      assetClass,
    tipo:             tipoLabel,
    product_type:     productType,
    nome:             item["auc.product_name"]   || null,
    ticker:           item["auc.product_symbol"] || null,
    quantidade:       item["auc.quantity"]       ?? null,
    valor_bruto_brl:  item["auc.auc_brl"]        ?? 0,
    valor_bruto_usd:  item["auc.auc_usd"]        ?? 0,
    maturity_date:    item["auc.maturity_date"]  || null,
    is_liquidity:     isLiquidity,
    office_name:      item["auc.office_name"]    || null,
  }

  // Mapeamento para o Front-end (Padronizado com a UI)
  const frontRow = {
    tipo:         tipoLabel,
    subTipo:      productType,
    emissor:      item["auc.product_name"]   || null,
    ticker:       item["auc.product_symbol"] || null,
    quantidade:   item["auc.quantity"]       ?? null,
    valorBruto:   item["auc.auc_brl"]        ?? 0,
    valorLiquido: item["auc.auc_brl"]        ?? 0,
    valorUsd:     item["auc.auc_usd"]        ?? 0,
    vencimento:   item["auc.maturity_date"]  || null,
    isLiquidity,
    extra: {
        assetType: productType,
        currency: 'USD'
    }
  }

  return { dbRow, frontRow }
}

function calcularTotais(parsed: any[]) {
  let patrimonio_total = 0, patrimonio_usd = 0, saldo_caixa = 0, saldo_rf = 0, saldo_rv = 0, saldo_fundos = 0, saldo_cripto = 0, saldo_outros = 0

  parsed.forEach(({ dbRow }) => {
    const brl = dbRow.valor_bruto_brl
    patrimonio_total += brl
    patrimonio_usd   += dbRow.valor_bruto_usd

    switch (dbRow.asset_class) {
      case 'CASH':            saldo_caixa  += brl; break
      case 'FIXED_INCOME':    saldo_rf     += brl; break
      case 'EQUITIES':        saldo_rv     += brl; break
      case 'INVESTMENT_FUND': saldo_fundos += brl; break
      case 'CRYPTO':          saldo_cripto += brl; break
      default:                saldo_outros += brl
    }
  })

  return { patrimonio_total, patrimonio_usd, saldo_caixa, saldo_rf, saldo_rv, saldo_fundos, saldo_cripto, saldo_outros }
}

function classificarProductType(type: string): string {
  if (type.includes('Balance')) return 'CASH'
  if (type.includes('Bonds'))   return 'FIXED_INCOME'
  if (type.includes('Funds'))   return 'INVESTMENT_FUND'
  if (type.includes('Stocks') || type.includes('ETF') || type.includes('UCIT')) return 'EQUITIES'
  if (type.includes('Crypto'))  return 'CRYPTO'
  return 'OTHER'
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