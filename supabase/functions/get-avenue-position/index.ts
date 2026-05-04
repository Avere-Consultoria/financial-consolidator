import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  // Pega a URL. Se não tiver, avisa logo.
  const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL');

  try {
    if (!CONSOLIDATOR_URL) {
       throw new Error("🚨 CONSOLIDATOR_URL não está configurada no Supabase Secrets!");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { clientId } = await req.json()
    if (!clientId) throw new Error('clientId não enviado')

    const { data: cliente } = await supabase
      .from('clientes')
      .select('codigo_avenue')
      .eq('id', clientId)
      .single()

    if (!cliente?.codigo_avenue) throw new Error('Código Avenue não encontrado no banco')

    // Volte alguns dias para garantir que a Avenue já fechou a custódia
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - 4); // Voltando 4 dias para garantir o teste de hoje
      const targetDate = dateObj.toISOString().split('T')[0];

      const fetchUrl = `${CONSOLIDATOR_URL}/api/v1/avenue/auc?date=${targetDate}&cpf=${cliente.codigo_avenue}`;

    // O pulo do gato: tentar o fetch e capturar se a rede cair
    let response;
    try {
        response = await fetch(fetchUrl, { 
          method: 'GET', 
          headers: { 'Content-Type': 'application/json' } 
        });
    } catch (networkError: any) {
        // Se cair aqui, a nuvem não consegue enxergar o Railway/Localhost!
        throw new Error(`🔥 Falha de Rede! Tentei acessar [${fetchUrl}] mas a conexão caiu. Detalhe: ${networkError.message}`);
    }

    const rawJson = await response.json()

    return new Response(JSON.stringify(rawJson), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})