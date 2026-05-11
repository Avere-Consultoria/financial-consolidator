// get-agora-position/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { cpfCnpj, accountCode, clientId } = await req.json()

    console.log(`🚀 Iniciando busca Ágora para cliente: ${clientId} (CPF: ${cpfCnpj})`)

    const AGORA_URL = `https://openapi.bradesco.com.br/managers-portfolio-mgmt/v1/listsummary/${cpfCnpj}/${accountCode}`
    const response = await fetch(AGORA_URL)
    
    if (!response.ok) throw new Error(`API Bradesco erro: ${response.status}`)

    const rawData = await response.json()
    const result = rawData.result
    
    if (!result) throw new Error("Chave 'result' não encontrada no JSON do Bradesco")

    console.log("✅ Dados recebidos da Ágora. Iniciando persistência...")

    const p = result.products || {}
    const patrimonio_total = result.valuePatrimonyTotalGross || 0
    const targetDate = new Date().toISOString().split('T')[0]

    // SALVAR SNAPSHOT
    const { data: snapshot, error: snapError } = await supabase
      .from('posicao_agora_snapshots')
      .upsert({
        cliente_id: clientId,
        data_referencia: targetDate,
        patrimonio_total,
        saldo_caixa: p.cc?.grossPatrimony || 0,
        saldo_rf: p.tpv?.grossPatrimony || 0,
        saldo_rv: p.rv?.grossPatrimony || 0,
        saldo_fundos: p.fun?.grossPatrimony || 0,
        saldo_outros: p.pvd?.grossPatrimony || 0,
        source: 'BRADESCO_OPEN_API'
      }, { onConflict: 'cliente_id,data_referencia' })
      .select('id').single()

    if (snapError) {
      console.error("❌ Erro ao salvar snapshot:", snapError.message)
      throw snapError
    }

    console.log(`✅ Snapshot salvo (ID: ${snapshot.id}). Mapeando ativos...`)

    // SALVAR ATIVOS
    const ativosParaSalvar = Object.values(p)
      .filter((item: any) => item.grossPatrimony > 0)
      .map((item: any) => ({
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
    const { error: insError } = await supabase.from('posicao_agora_ativos').insert(ativosParaSalvar)
    
    if (insError) console.error("❌ Erro ao inserir ativos:", insError.message)

    console.log(`🎯 Sucesso! ${ativosParaSalvar.length} registros processados.`)

    return new Response(JSON.stringify({ success: true, patrimonioTotal: patrimonio_total }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err: any) {
    console.error("🔥 FALHA CRÍTICA:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})