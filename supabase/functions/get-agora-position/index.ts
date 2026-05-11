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

    // 1. URL do SEU consolidador na Railway
    const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL') 
    const url = `${CONSOLIDATOR_URL}/api/v1/agora/listsummary/${cpfCnpj}/${accountCode}`
    
    console.log("🔗 Chamando Railway:", url)
    const response = await fetch(url)
    const payload = await response.json()

    // DEBUG: Ver o que a Railway respondeu de verdade
    console.log("📦 Payload da Railway:", JSON.stringify(payload))

    const result = payload.result
    if (!result) throw new Error("A Railway não retornou a chave 'result'.")

    const targetDate = new Date().toISOString().split('T')[0]

    // 2. SALVAR SNAPSHOT (O MÍNIMO POSSÍVEL)
    const { data: snapshot, error: snapError } = await supabase
      .from('posicao_agora_snapshots')
      .upsert({
        cliente_id: clientId,
        data_referencia: targetDate,
        patrimonio_total: result.valuePatrimonyTotalGross || 0,
        saldo_caixa: result.products?.cc?.grossPatrimony || 0,
        source: 'DEBUG_RAIO_X'
      }, { onConflict: 'cliente_id,data_referencia' })
      .select('id').single()

    if (snapError) {
        console.error("❌ Erro de Banco:", snapError.message)
        throw snapError
    }

    console.log("✅ Snapshot salvo com ID:", snapshot.id)

    return new Response(JSON.stringify({ success: true, data: result }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err: any) {
    console.error("🔥 Erro Crítico:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 400, 
        headers: corsHeaders 
    })
  }
})