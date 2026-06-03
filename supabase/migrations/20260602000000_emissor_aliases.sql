-- ─────────────────────────────────────────────────────────────────────────────
-- Aliases de emissor — nomes alternativos que as APIs usam para o mesmo emissor.
-- O classificador casa o emissor bruto do ativo contra nome_fantasia + aliases.
-- Rastreável, incluível e removível pelo master no modal do emissor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emissor_aliases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emissor_id  UUID NOT NULL REFERENCES dicionario_emissores(id) ON DELETE CASCADE,
    alias       TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (emissor_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_emissor_alias_emissor ON emissor_aliases (emissor_id);

ALTER TABLE emissor_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_alias"  ON emissor_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_alias" ON emissor_aliases FOR ALL    TO authenticated USING (true) WITH CHECK (true);
