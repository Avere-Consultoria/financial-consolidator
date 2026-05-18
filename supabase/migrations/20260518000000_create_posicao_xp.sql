-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: complementa tabelas XP existentes com colunas de classificação
-- As tabelas posicao_xp_snapshots e posicao_xp_ativos já existem no banco
-- criadas pelo front-end. Adicionamos apenas o que falta para o back-end.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Colunas faltantes em posicao_xp_ativos ───────────────────────────────────
ALTER TABLE posicao_xp_ativos
  ADD COLUMN IF NOT EXISTS asset_class  TEXT,
  ADD COLUMN IF NOT EXISTS benchmark    TEXT,
  ADD COLUMN IF NOT EXISTS is_liquidity BOOLEAN NOT NULL DEFAULT false;

-- ── Índice de asset_class (agora que a coluna existe) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_xp_ativos_asset_class ON posicao_xp_ativos(asset_class);

-- ── Garantir UNIQUE na tabela de snapshots (se não existir) ──────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'posicao_xp_snapshots'::regclass
      AND contype = 'u'
      AND conname LIKE '%cliente%data%'
  ) THEN
    ALTER TABLE posicao_xp_snapshots
      ADD CONSTRAINT posicao_xp_snapshots_cliente_data_uq
      UNIQUE (cliente_id, data_referencia);
  END IF;
END$$;

COMMENT ON COLUMN posicao_xp_ativos.asset_class  IS 'Classe do ativo no padrão interno (FIXED_INCOME, EQUITIES, etc.)';
COMMENT ON COLUMN posicao_xp_ativos.benchmark    IS 'Benchmark/indexador do ativo';
COMMENT ON COLUMN posicao_xp_ativos.is_liquidity IS 'Flag de liquidez diária';
