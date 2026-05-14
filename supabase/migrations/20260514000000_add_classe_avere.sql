-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: adiciona coluna classe_avere nas tabelas de ativos
-- Classifica cada ativo nas 15 categorias padronizadas da AVERE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE posicao_btg_ativos
  ADD COLUMN IF NOT EXISTS classe_avere TEXT;

ALTER TABLE posicao_agora_ativos
  ADD COLUMN IF NOT EXISTS classe_avere TEXT;

ALTER TABLE posicao_avenue_ativos
  ADD COLUMN IF NOT EXISTS classe_avere TEXT;

-- Comentários
COMMENT ON COLUMN posicao_btg_ativos.classe_avere    IS 'Classificação AVERE padrão (15 categorias)';
COMMENT ON COLUMN posicao_agora_ativos.classe_avere  IS 'Classificação AVERE padrão (15 categorias)';
COMMENT ON COLUMN posicao_avenue_ativos.classe_avere IS 'Classificação AVERE padrão (15 categorias)';
