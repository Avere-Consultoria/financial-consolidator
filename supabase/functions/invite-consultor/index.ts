import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, exigirMaster } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Auth: somente MASTER pode convidar ──────────────────────────────
    const authResult = await validarAuth(req)
    if ('error' in authResult) return authResult.error
    const ctx = authResult.ctx

    const masterError = exigirMaster(ctx)
    if (masterError) return masterError

    const { consultor_id, email, nome } = await req.json().catch(() => ({}))

    if (!email || !consultor_id) {
      return errorResponse('email e consultor_id são obrigatórios', 400)
    }

    const supabaseAdmin = createServiceClient()

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { consultor_id, nome },
    })

    if (error) {
      console.error('inviteUserByEmail error:', error.message)
      return errorResponse(error.message, error.status ?? 400)
    }

    return jsonResponse({ success: true, user_id: data.user.id })

  } catch (err: unknown) {
    console.error('invite-consultor erro:', (err as Error)?.message)
    return errorResponse('Erro interno', 500)
  }
})
