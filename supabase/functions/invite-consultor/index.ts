import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, exigirMaster } from '../_shared/auth.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Provisiona o ACESSO de um consultor já cadastrado, de forma atômica e sem
// depender de SMTP:
//   1. cria o usuário de login (email_confirm = true) com senha temporária;
//   2. cria/atualiza a linha em `perfis` (id = uid, role);
//   3. vincula `consultores.perfil_id = uid`.
// Em qualquer falha, faz rollback do que já criou. Devolve a senha p/ o master
// repassar ao consultor. Somente MASTER pode executar.
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authResult = await validarAuth(req)
    if ('error' in authResult) return authResult.error
    const masterError = exigirMaster(authResult.ctx)
    if (masterError) return masterError

    const { consultor_id, email, nome, senha, role } = await req.json().catch(() => ({}))
    if (!consultor_id || !email || !senha) {
      return errorResponse('consultor_id, email e senha são obrigatórios', 400)
    }
    if (String(senha).length < 8) {
      return errorResponse('A senha temporária deve ter ao menos 8 caracteres', 400)
    }
    // Domínio de roles (mesmo do check constraint perfis_role_check) — valida
    // aqui pra falhar com mensagem clara em vez de erro de constraint.
    const ROLES_VALIDOS = new Set(['MASTER', 'CONSULTOR_INTERNO', 'CONSULTOR_EXTERNO', 'CLIENTE'])
    if (role && !ROLES_VALIDOS.has(role)) {
      return errorResponse(`role inválido: "${role}". Válidos: ${[...ROLES_VALIDOS].join(', ')}`, 400)
    }

    const admin = createServiceClient()

    // 0. Pré-checagem: o consultor precisa existir ANTES de criarmos login/perfil —
    //    senão um consultor_id inválido deixaria um usuário de Auth órfão (update
    //    em 0 linhas não dá erro). Confere também que o e-mail bate com o cadastro.
    const { data: consultor, error: errBusca } = await admin
      .from('consultores')
      .select('id, email_professional')
      .eq('id', consultor_id)
      .maybeSingle()
    if (errBusca) return errorResponse(`Falha ao localizar consultor: ${errBusca.message}`, 400)
    if (!consultor) return errorResponse('Consultor não encontrado', 404)
    if (consultor.email_professional &&
        consultor.email_professional.toLowerCase() !== String(email).toLowerCase()) {
      return errorResponse('O e-mail informado não confere com o cadastro do consultor', 400)
    }

    // 1. Usuário de login (idempotente): cria; se já existir, redefine a senha.
    let uid: string
    const { data: created, error: errCreate } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    })
    const criadoAgora = !!created?.user
    if (created?.user) {
      uid = created.user.id
    } else {
      // Já existe (ou criação falhou) → localiza pelo e-mail e redefine a senha.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existente = list?.users?.find((u: any) => (u.email ?? '').toLowerCase() === String(email).toLowerCase())
      if (!existente) {
        return errorResponse(errCreate?.message ?? 'Falha ao criar usuário de login', 400)
      }
      uid = existente.id
      const { error: errUpd } = await admin.auth.admin.updateUserById(uid, { password: senha, email_confirm: true })
      if (errUpd) return errorResponse(`Falha ao redefinir senha: ${errUpd.message}`, 400)
    }

    // 2. Perfil (id = uid). upsert para robustez caso exista trigger de signup.
    const { error: errPerfil } = await admin.from('perfis').upsert(
      { id: uid, email, nome: nome ?? null, role: role ?? 'CONSULTOR_INTERNO' },
      { onConflict: 'id' },
    )
    if (errPerfil) {
      if (criadoAgora) await admin.auth.admin.deleteUser(uid)
      return errorResponse(`Falha ao criar perfil: ${errPerfil.message}`, 400)
    }

    // 3. Vínculo consultor ↔ login. `.select()` confirma que UMA linha foi afetada:
    //    update sem match volta sucesso com 0 linhas, então sem isso um órfão passaria.
    const { data: linkRows, error: errLink } = await admin.from('consultores')
      .update({ perfil_id: uid })
      .eq('id', consultor_id)
      .select('id')
    if (errLink || !linkRows || linkRows.length === 0) {
      if (criadoAgora) { await admin.from('perfis').delete().eq('id', uid); await admin.auth.admin.deleteUser(uid) }
      return errorResponse(`Falha ao vincular consultor: ${errLink?.message ?? 'consultor não encontrado'}`, 400)
    }

    return jsonResponse({ success: true, user_id: uid, email, senha })

  } catch (err: unknown) {
    console.error('invite-consultor erro:', (err as Error)?.message)
    return errorResponse('Erro interno', 500)
  }
})
