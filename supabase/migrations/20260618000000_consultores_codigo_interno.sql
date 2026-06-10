-- ═══════════════════════════════════════════════════════════════════════════
-- codigo_interno em consultores — chave de negócio usada na carga inicial.
--
-- A base de clientes liga cada cliente ao consultor pelo "código interno"
-- (1001..1022). Como clientes.consultor_id guarda o PERFIL (auth.uid) — que só
-- existe após o provisionamento de login — usamos codigo_interno para:
--   • identificar o consultor na carga (sem depender de login);
--   • fazer o backfill de clientes.consultor_id quando o login for criado.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE consultores ADD COLUMN IF NOT EXISTS codigo_interno integer;

CREATE UNIQUE INDEX IF NOT EXISTS uq_consultores_codigo_interno
    ON consultores (codigo_interno) WHERE codigo_interno IS NOT NULL;
