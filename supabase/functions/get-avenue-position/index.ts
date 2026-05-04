import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 1. Headers expandidos para evitar qualquer rejeição do navegador[cite: 1]
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL') ?? 'http://localhost:3333'

Deno.serve(async (req) => {
  // 2. Resposta de Preflight ultra-limpa e explícita
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { clientId } = await req.json()
    if (!clientId) throw new Error('clientId é obrigatório')

    const { data: cliente, error: cliError } = await supabase
      .from('clientes')
      .select('codigo_avenue')
      .eq('id', clientId)
      .single()

    if (cliError || !cliente?.codigo_avenue) {
      throw new Error('Código Avenue não encontrado para este cliente.')
    }

    const today = new Date().toISOString().split('T')[0]
    
    // 3. Log de depuração no console do Supabase para você ver o erro de rede
    console.log(`Tentando conectar em: ${CONSOLIDATOR_URL}`)

    const response = await fetch(
      `${CONSOLIDATOR_URL}/avenue/auc?date=${today}&cpf=${cliente.codigo_avenue}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )

    const rawJson = await response.json()

    return new Response(
      JSON.stringify(rawJson),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.ok ? 200 : 400
      }
    )

  } catch (err: any) {
    // 4. Garante que mesmo o erro retorne os Headers de CORS[cite: 1, 2]
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})