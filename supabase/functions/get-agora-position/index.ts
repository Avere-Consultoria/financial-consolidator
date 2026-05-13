import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mesma lógica do BTG Edge Function — tipo = categoria legível, sub_tipo = código específico
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

// sub_tipo: bondType do extra (ex: "LTN", "NTN-B", "CRA") ou fallback por classe
function resolverSubTipo(a: any): string {
  return a.extra?.bondType || a.extra?.securityType || mapSubTipoPadrao(a.assetClass) || ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // IMPORTANTE: Usando SERVICE_ROLE_KEY para ter poder total de escrita
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!, 
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const { cpfCnpj, accountCode, clientId } = await req.json()
    const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL')
    
    const response = await fetch(`${CONSOLIDATOR_URL}/api/v1/position/agora/${cpfCnpj}/${accountCode}`)
    const payload = await response.json()
    const data = payload.data || payload

    if (!data.totalAmount) throw new Error("Railway não retornou patrimônio.")

    const targetDate = new Date().toISOString().split('T')[0]

    // TENTATIVA DE GRAVAÇÃO COM LOG DE ERRO EXPLÍCITO
    const { data: snapshot, error: snapError } = await supabase
      .from('posicao_agora_snapshots')
      .upsert({
        cliente_id: clientId,
        data_referencia: targetDate,
        patrimonio_total: data.totalAmount,
        saldo_rf: data.assets?.filter((a:any) => a.assetClass === 'FIXED_INCOME').reduce((s:number, a:any) => s + (a.grossValue || 0), 0) || 0,
        saldo_rv: data.assets?.filter((a:any) => a.assetClass === 'EQUITIES').reduce((s:number, a:any) => s + (a.grossValue || 0), 0) || 0,
        saldo_fundos: data.assets?.filter((a:any) => a.assetClass === 'INVESTMENT_FUND').reduce((s:number, a:any) => s + (a.grossValue || 0), 0) || 0,
        saldo_caixa: data.assets?.filter((a:any) => a.assetClass === 'CASH').reduce((s:number, a:any) => s + (a.grossValue || 0), 0) || 0,
        source: 'AGORA_API'
      }, { onConflict: 'cliente_id,data_referencia' })
      .select().single()

    if (snapError) {
        console.error("ERRO SUPABASE SNAPSHOT:", snapError)
        throw new Error(`Erro ao salvar no banco: ${snapError.message}`)
    }

    // Se salvou o snapshot, salva os ativos
    if (data.assets && data.assets.length > 0) {
        const ativos = data.assets.map((a: any) => ({
            snapshot_id:         snapshot.id,
            asset_class:         a.assetClass,
            tipo:                mapTipoLabel(a.assetClass),
            sub_tipo:            resolverSubTipo(a) || null,
            emissor:             a.extra?.issuerName || a.extra?.companyName || a.name || 'Ágora',
            ticker:              a.ticker || null,
            security_code:       a.securityCode || null,
            // Valores
            valor_bruto:         Number(a.grossValue || 0),
            valor_liquido:       Number(a.netValue || a.grossValue || 0),
            custo_total:         a.costPrice ? Number(a.costPrice) : null,
            preco_unitario:      a.marketPrice ? Number(a.marketPrice) : null,
            quantidade:          Number(a.quantity ?? 1),
            // Rentabilidade
            taxa:                a.extra?.bondRate || null,
            taxa_percentual:     a.extra?.preTaxPercentage ? Number(a.extra.preTaxPercentage) : null,
            indexer_percentual:  a.extra?.indexerPercentage ? Number(a.extra.indexerPercentage) : null,
            valorizacao:         a.extra?.valueAppreciation ? Number(a.extra.valueAppreciation) : null,
            percent_valorizacao: a.extra?.percentAppreciation ? Number(a.extra.percentAppreciation) : null,
            // Impostos
            ir_valor:            a.extra?.bondTaxValue ? Number(a.extra.bondTaxValue) : null,
            iof_valor:           a.extra?.iofTaxValue ? Number(a.extra.iofTaxValue) : null,
            ir_percentual:       a.extra?.bondTaxPercentage || null,
            ir_descricao:        a.extra?.bondTaxDescription || null,
            // Datas
            data_vencimento:     a.maturityDate ? String(a.maturityDate).split('T')[0] : null,
            data_aplicacao:      a.acquisitionDate ? String(a.acquisitionDate).split('T')[0] : null,
            // Flags
            liquidez_diaria:     a.isLiquidity ?? false,
        }))
        await supabase.from('posicao_agora_ativos').delete().eq('snapshot_id', snapshot.id)
        const { error: ativosError } = await supabase.from('posicao_agora_ativos').insert(ativos)
        if (ativosError) console.error("ERRO ATIVOS:", ativosError)
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("ERRO GERAL:", err.message, err.stack)
    return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: corsHeaders
    })
  }
})