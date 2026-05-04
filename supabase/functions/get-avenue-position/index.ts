import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 1. Headers de CORS fundamentais para o navegador aceitar a chamada do localhost
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URL do seu back-end dedicado (Node/Bun) que faz as chamadas bancárias
const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL') ?? 'http://localhost:3333'

Deno.serve(async (req) => {
  // 2. Trata o Preflight (CORS) - ISSO RESOLVE O SEU ERRO DO CONSOLE
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 3. Pega o clientId enviado pelo front[cite: 1]
    const { clientId } = await req.json()
    if (!clientId) throw new Error('clientId é obrigatório')

    // 4. Busca o código da Avenue que acabamos de adicionar na tabela 'clientes'
    const { data: cliente, error: cliError } = await supabase
      .from('clientes')
      .select('codigo_avenue')
      .eq('id', clientId)
      .single()

    if (cliError || !cliente?.codigo_avenue) {
      throw new Error('Código Avenue não encontrado para este cliente no banco.')
    }

    console.log(`Buscando posição Avenue para conta: ${cliente.codigo_avenue}`)

    // 5. Chama o seu back-end de integração (financial-consolidator)
    const response = await fetch(
      `${CONSOLIDATOR_URL}/api/v1/position/avenue/${cliente.codigo_avenue}`,
      { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' } 
      }
    )

    const rawJson = await response.json()

    // 6. Retorna o JSON bruto diretamente para o front (sua tela de Debug)[cite: 1]
    return new Response(
      JSON.stringify(rawJson),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.ok ? 200 : 400
      }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})