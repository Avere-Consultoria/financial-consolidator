import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createServiceClient } from './supabaseClient.ts'
import { errorResponse } from './cors.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Autenticação e autorização para Edge Functions
//
// Fluxo:
//   1. validarAuth(req) — valida JWT e retorna { userId, role, isMaster }
//   2. validarOwnershipCliente(ctx, clienteId) — checa se user é MASTER ou
//      o consultor responsável pelo cliente
//
// Uso típico no Edge Function:
//
//   const authResult = await validarAuth(req)
//   if ('error' in authResult) return authResult.error
//   const ctx = authResult.ctx
//
//   // ... resolve cliente_id do request ...
//
//   const ownerError = await validarOwnershipCliente(ctx, clienteId)
//   if (ownerError) return ownerError
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthContext {
  userId:   string
  role:     string
  isMaster: boolean
}

/**
 * Valida o JWT do request e retorna o contexto de autenticação.
 * Em caso de falha, retorna { error: Response } pronto para devolver ao caller.
 */
export async function validarAuth(req: Request): Promise<
  | { ctx: AuthContext }
  | { error: Response }
> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { error: errorResponse('Authorization header obrigatório', 401) }
  }

  // Cliente com o JWT do usuário (apenas para getUser)
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: errAuth } = await supabaseAuth.auth.getUser()
  if (errAuth || !user) {
    return { error: errorResponse('Não autorizado', 401) }
  }

  // Lookup do perfil (com SERVICE_ROLE para ignorar RLS)
  const supabaseService = createServiceClient()
  const { data: perfil } = await supabaseService
    .from('perfis')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = perfil?.role ?? ''

  return {
    ctx: {
      userId:   user.id,
      role,
      isMaster: role === 'MASTER',
    },
  }
}

/**
 * Garante que o usuário é MASTER ou o consultor responsável pelo cliente.
 * Retorna null se autorizado, ou Response de erro 403/404.
 */
export async function validarOwnershipCliente(
  ctx: AuthContext,
  clienteId: string,
): Promise<Response | null> {
  if (ctx.isMaster) return null

  const supabaseService = createServiceClient()
  const { data: cliente, error } = await supabaseService
    .from('clientes')
    .select('consultor_id')
    .eq('id', clienteId)
    .maybeSingle()

  if (error || !cliente) {
    return errorResponse('Cliente não encontrado', 404)
  }

  if (cliente.consultor_id !== ctx.userId) {
    return errorResponse('Acesso negado: você não é o consultor responsável por este cliente', 403)
  }

  return null
}

/**
 * Garante que o usuário é MASTER. Retorna null se autorizado, ou 403.
 */
export function exigirMaster(ctx: AuthContext): Response | null {
  if (ctx.isMaster) return null
  return errorResponse('Acesso negado: apenas usuários MASTER podem executar esta operação', 403)
}
