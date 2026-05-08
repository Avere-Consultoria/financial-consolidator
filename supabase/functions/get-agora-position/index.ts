import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-agora-position
// Chama o backend Railway para buscar posição consolidada da Ágora
// ─────────────────────────────────────────────────────────────────────────────

const RAILWAY_BASE_URL = 'https://financial-consolidator-production.up.railway.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cpfCnpj, accountCode, endpoint = 'listsummary' } = await req.json();

    if (!cpfCnpj || !accountCode) {
      return new Response(
        JSON.stringify({ error: 'cpfCnpj e accountCode são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Monta a URL do Railway
    const url = `${RAILWAY_BASE_URL}/api/v1/agora/position/${cpfCnpj}/${accountCode}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err: any) {
    console.error('Erro na Edge Function get-agora-position:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});