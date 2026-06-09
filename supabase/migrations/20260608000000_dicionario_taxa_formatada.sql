-- ─────────────────────────────────────────────────────────────────────────────
-- taxa_formatada por visão institucional (dicionario_ativos).
-- Permite mostrar a TAXA + CUPOM no card "Como cada instituição vê este ativo".
-- É a taxa daquela corretora, formatada igual à do canônico (mesma origem do dado).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE dicionario_ativos
    ADD COLUMN IF NOT EXISTS taxa_formatada TEXT;

-- Backfill: parte da taxa do canônico (mesma origem) até o próximo sync popular
-- a versão por instituição.
UPDATE dicionario_ativos d
SET taxa_formatada = c.taxa_formatada
FROM ativos_canonicos c
WHERE d.ativo_canonico_id = c.id
  AND d.taxa_formatada IS NULL
  AND c.taxa_formatada IS NOT NULL;

COMMENT ON COLUMN dicionario_ativos.taxa_formatada IS 'Taxa (TAXA + CUPOM) como aquela instituição reporta — preenchida no sync.';
