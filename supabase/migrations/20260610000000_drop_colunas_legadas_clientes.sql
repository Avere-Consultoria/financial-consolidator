-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 4 — Limpeza: remove as colunas legadas de `clientes` e o trigger de
-- espelhamento. O multi-conta (cliente_contas) está validado; nada mais lê essas
-- colunas (edge functions resolvem por cliente_contas; frontend idem).
--
-- ⚠️ Aplicar SOMENTE depois de subir o frontend novo (que não lê mais as colunas).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Trigger + funções de espelhamento (rede de segurança da transição)
DROP TRIGGER IF EXISTS cliente_contas_sync_legado ON cliente_contas;
DROP FUNCTION IF EXISTS trg_sync_codigos_legados();
DROP FUNCTION IF EXISTS sync_codigos_legados(UUID);
DROP FUNCTION IF EXISTS _inst_id(TEXT);

-- 2. Colunas legadas de código por corretora + documento (agora em cliente_contas)
ALTER TABLE clientes DROP COLUMN IF EXISTS codigo_btg;
ALTER TABLE clientes DROP COLUMN IF EXISTS codigo_xp;
ALTER TABLE clientes DROP COLUMN IF EXISTS codigo_avenue;
ALTER TABLE clientes DROP COLUMN IF EXISTS codigo_agora;
ALTER TABLE clientes DROP COLUMN IF EXISTS cpf;
