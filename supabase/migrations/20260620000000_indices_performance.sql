-- ═══════════════════════════════════════════════════════════════════════════
-- Performance: índices nas tabelas de posição (faltavam os mais usados).
--
-- Padrões de acesso:
--   • Home / fechar_mes / listar_*: WHERE cliente_id = ... [AND data BETWEEN]
--     + "mais recente por conta" (DISTINCT ON conta_id ORDER BY data DESC).
--     → composto (cliente_id, conta_id, data_referencia DESC).
--   • ativos aninhados / poda / fechamento: join por snapshot_id.
--     → índice em (snapshot_id) nos ativos de API (manual já tinha).
--   • poda/aninhado BTG: aquisições e janelas por ativo_id.
-- Tudo aditivo e idempotente (IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Snapshots: (cliente_id, conta_id, data_referencia DESC) ──────────────────
CREATE INDEX IF NOT EXISTS idx_btg_snap_cli_conta_data    ON posicao_btg_snapshots    (cliente_id, conta_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_xp_snap_cli_conta_data     ON posicao_xp_snapshots     (cliente_id, conta_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_avenue_snap_cli_conta_data ON posicao_avenue_snapshots (cliente_id, conta_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_agora_snap_cli_conta_data  ON posicao_agora_snapshots  (cliente_id, conta_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_manual_snap_cli_conta_data ON posicao_manual_snapshots (cliente_id, conta_id, data_referencia DESC);

-- ── Ativos de API: (snapshot_id) ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_btg_ativos_snapshot    ON posicao_btg_ativos    (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_xp_ativos_snapshot     ON posicao_xp_ativos     (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_avenue_ativos_snapshot ON posicao_avenue_ativos (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_agora_ativos_snapshot  ON posicao_agora_ativos  (snapshot_id);

-- ── BTG aquisições/janelas: (ativo_id) ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_btg_aquisicoes_ativo ON posicao_btg_aquisicoes      (ativo_id);
CREATE INDEX IF NOT EXISTS idx_btg_janelas_ativo    ON posicao_btg_janelas_liquidez (ativo_id);
