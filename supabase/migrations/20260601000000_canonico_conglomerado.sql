-- ─────────────────────────────────────────────────────────────────────────────
-- Risco do ativo canônico nos 2 mundos:
--   • emissor_id      → crédito privado (debênture/CRA/CRI…) [já existia]
--   • conglomerado_id → crédito bancário FGC (CDB/LCI/LCA/LF…) [novo]
-- Preenchidos pelo classificador automático (matching por nome/CNPJ) e
-- ajustáveis manualmente na Master Ativos.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE ativos_canonicos
    ADD COLUMN IF NOT EXISTS conglomerado_id UUID REFERENCES dicionario_conglomerados(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_canonico_conglomerado ON ativos_canonicos (conglomerado_id);
