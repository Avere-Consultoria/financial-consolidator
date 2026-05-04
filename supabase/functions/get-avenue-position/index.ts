import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 1. Headers de permissão total para o navegador[cite: 1]
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL') ?? ''

Deno.serve(async (req) => {
  // 2. Resposta imediata para o Preflight (Obrigatório para sumir o erro do console)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 3. Pegar o body com segurança[cite: 1]
    const { clientId } = await req.json()
    if (!clientId) throw new Error('clientId não enviado')

    const { data: cliente } = await supabase
      .from('clientes')
      .select('codigo_avenue')
      .eq('id', clientId)
      .single()

    if (!cliente?.codigo_avenue) throw new Error('Código Avenue não encontrado no banco')

    const today = new Date().toISOString().split('T')[0]
    
    // 4. Chamada para o Railway
    const fetchUrl = `${CONSOLIDATOR_URL}/avenue/auc?date=${today}&cpf=${cliente.codigo_avenue}`
    console.log("Chamando Railway:", fetchUrl)

    const response = await fetch(fetchUrl, { 
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' } 
    })

    const rawJson = await response.json()

    // 5. Resposta de sucesso com Headers[cite: 1]
    return new Response(JSON.stringify(rawJson), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    // 6. Resposta de erro também PRECISA de headers de CORS[cite: 2]
    // Se o erro retornar sem headers, o navegador mostra erro de CORS em vez do erro real
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})