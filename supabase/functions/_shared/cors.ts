// ─────────────────────────────────────────────────────────────────────────────
// CORS + respostas HTTP padronizadas para todas as Edge Functions
// ─────────────────────────────────────────────────────────────────────────────

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

export function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: { message } }),
    { status, headers: jsonHeaders }
  )
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}
