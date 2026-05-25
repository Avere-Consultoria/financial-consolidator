-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: adicionar vencimento_customizado e emissor_customizado_id
--            na tabela excecoes_classificacao
--
-- vencimento_customizado  → consultor pode sobrescrever a data de vencimento
-- emissor_customizado_id  → reservado para uso futuro (MASTER only por ora)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE excecoes_classificacao
  ADD COLUMN IF NOT EXISTS vencimento_customizado  DATE,
  ADD COLUMN IF NOT EXISTS emissor_customizado_id  UUID REFERENCES dicionario_emissores(id);
