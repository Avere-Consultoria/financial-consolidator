import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// Cliente Supabase com Service Role (acesso total, ignora RLS)
// Para uso em Edge Functions que precisam ler/gravar como admin.
// ─────────────────────────────────────────────────────────────────────────────

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !key) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes nas variáveis de ambiente')
  }

  return createClient(url, key)
}
