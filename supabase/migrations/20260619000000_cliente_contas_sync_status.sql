-- ═══════════════════════════════════════════════════════════════════════════
-- Estado de sincronização por conta — alimenta a Central de Sincronização.
--   • ultima_sync    : quando a conta foi sincronizada com sucesso pela última vez
--   • ultimo_status  : 'ok' | 'erro' (último resultado conhecido)
--   • ultimo_erro    : mensagem do último erro (quando status = 'erro')
-- O sucesso é carimbado pelas edge functions (autoritativo, vale p/ o agendado
-- futuro). O erro de tentativas via painel é registrado pelo frontend (master).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE cliente_contas ADD COLUMN IF NOT EXISTS ultima_sync   timestamptz;
ALTER TABLE cliente_contas ADD COLUMN IF NOT EXISTS ultimo_status text;
ALTER TABLE cliente_contas ADD COLUMN IF NOT EXISTS ultimo_erro   text;
