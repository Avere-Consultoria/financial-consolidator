-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: colunas de taxa/indexador faltantes em posicao_xp_ativos.
-- A edge get-xp-position passou a gravar `rentabilidade` (taxaCompleta, ex.
-- "IPC-A +3,51%") e `indexador`, mas as colunas não existiam → insert falhava
-- com "Could not find the 'rentabilidade' column ... in the schema cache" (500),
-- abortando todo o sync do XP. IF NOT EXISTS = idempotente.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE posicao_xp_ativos
  ADD COLUMN IF NOT EXISTS rentabilidade TEXT,
  ADD COLUMN IF NOT EXISTS indexador     TEXT;

COMMENT ON COLUMN posicao_xp_ativos.rentabilidade IS 'Taxa completa do ativo (ex.: "IPC-A +3,51%"); a Home formata a taxa a partir daqui';
COMMENT ON COLUMN posicao_xp_ativos.indexador     IS 'Indexador/benchmark do ativo (espelha benchmark)';
