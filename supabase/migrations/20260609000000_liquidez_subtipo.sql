-- ─────────────────────────────────────────────────────────────────────────────
-- Liquidez padrão por subtipo de ativo (configurável, com toggle por subtipo).
--   consultor_id NULL = padrão GLOBAL (Gestão Master)
--   consultor_id != NULL = override do consultor (Personalizar) — vence o global
--
-- padronizar = false (DEFAULT) → comportamento atual (liquidez segue o vencimento).
-- padronizar = true → o subtipo usa liquidez_dias (D+N) nos gráficos de liquidez.
-- O vencimento NUNCA é alterado — segue alimentando a agenda de vencimentos.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS liquidez_subtipo (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultor_id  UUID REFERENCES perfis(id) ON DELETE CASCADE,  -- NULL = global
    sub_tipo      TEXT NOT NULL,
    liquidez_dias INT,
    padronizar    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Um padrão global por subtipo; um override por (consultor, subtipo).
CREATE UNIQUE INDEX IF NOT EXISTS uq_liqsub_global
    ON liquidez_subtipo (sub_tipo) WHERE consultor_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_liqsub_consultor
    ON liquidez_subtipo (consultor_id, sub_tipo) WHERE consultor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_liqsub_consultor ON liquidez_subtipo (consultor_id);

ALTER TABLE liquidez_subtipo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_liqsub"  ON liquidez_subtipo FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_liqsub" ON liquidez_subtipo FOR ALL    TO authenticated USING (true) WITH CHECK (true);
