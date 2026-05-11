import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { cpfCnpj, accountCode, clientId } = await req.json()
    
    // 1. Chamar API do Bradesco (ajuste a URL conforme seu ambiente)
    const AGORA_URL = `https://openapi.bradesco.com.br/managers-portfolio-mgmt/v1/listsummary/${cpfCnpj}/${accountCode}`
    
    const response = await fetch(AGORA_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const rawData = await response.json()
    const result = rawData.result // A chave principal do Bradesco

    if (!result) throw new Error("Resposta da Ágora não contém a chave 'result'")

    // 2. Extrair saldos das categorias
    const p = result.products || {}
    const saldo_caixa  = p.cc?.grossPatrimony || 0
    const saldo_rv     = p.rv?.grossPatrimony || 0
    const saldo_rf     = p.tpv?.grossPatrimony || 0
    const saldo_fundos = p.fun?.grossPatrimony || 0
    const saldo_outros = p.pvd?.grossPatrimony || 0 // Previdência como outros

    const patrimonio_total = result.valuePatrimonyTotalGross || 0
    const targetDate = new Date().toISOString().split('T')[0]

    // 3. Salvar Snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from('posicao_agora_snapshots')
      .upsert({
        cliente_id: clientId,
        data_referencia: targetDate,
        patrimonio_total,
        saldo_caixa,
        saldo_rf,
        saldo_rv,
        saldo_fundos,
        saldo_outros,
        source: 'BRADESCO_OPEN_API'
      }, { onConflict: 'cliente_id,data_referencia' })
      .select('id')
      .single()

    if (snapError) throw snapError

    // 4. Mapear Categorias como "Ativos" para preencher a tabela
    // Nota: O endpoint 'listsummary' não traz papel por papel, apenas os totais por classe.
    // Vamos salvar as classes como se fossem ativos para a tabela não ficar vazia.
    const ativosParaSalvar = Object.values(p).filter((item: any) => item.grossPatrimony > 0).map((item: any) => ({
      snapshot_id: snapshot.id,
      tipo: item.description,
      sub_tipo: item.instrumentType,
      emissor: 'Ágora Investimentos',
      ticker: item.instrumentType,
      valor_bruto: item.grossPatrimony,
      valor_liquido: item.liquidPatrimony,
      quantidade: 1
    }))

    await supabase.from('posicao_agora_ativos').delete().eq('snapshot_id', snapshot.id)
    if (ativosParaSalvar.length > 0) {
      await supabase.from('posicao_agora_ativos').insert(ativosParaSalvar)
    }

    return new Response(JSON.stringify({
      patrimonioTotal: patrimonio_total,
      dataReferencia: targetDate,
      alocacao: [
        { classe: 'Caixa', valor: saldo_caixa },
        { classe: 'Renda Fixa', valor: saldo_rf },
        { classe: 'Renda Variável', valor: saldo_rv },
        { classe: 'Fundos', valor: saldo_fundos },
        { classe: 'Previdência', valor: saldo_outros },
      ].filter(a => a.valor > 0),
      ativos: ativosParaSalvar // Retorna para o front exibir na hora
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400 
    })
  }
})