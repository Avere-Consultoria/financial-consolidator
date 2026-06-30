-- ═══════════════════════════════════════════════════════════════════════════
-- PERF — índice do lookup de canônico (maior alavanca do sync).
--
-- O pipeline resolve o canônico por codigo_identificador (canonico.ts:83), 1x por
-- ativo em todo sync/reprocesso. O único índice que cobre a coluna era o UNIQUE
-- (instituicao_origem, codigo_identificador, tipo_identificador) — com
-- instituicao_origem como LÍDER, inútil pra um filtro só por codigo_identificador.
-- Resultado: seq scan por ativo, que cresce com a base.
--
-- Índice covering: a 2ª coluna (ativo_canonico_id) é exatamente o que o lookup
-- seleciona → permite index-only scan.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_dicionario_codigo
    ON dicionario_ativos (codigo_identificador, ativo_canonico_id);
