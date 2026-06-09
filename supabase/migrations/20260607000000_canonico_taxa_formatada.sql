-- ─────────────────────────────────────────────────────────────────────────────
-- taxa_formatada no canônico — a TAXA + CUPOM já pronta para exibição.
-- A Home monta isso dos dados crus da posição (rentabilidade + benchmark + cupom),
-- mas Master/Personalizar leem o canônico. Esta coluna guarda a taxa formatada no
-- sync (via formatarTaxa) para que todo o sistema mostre a MESMA taxa.
-- Frontend lê taxa_formatada com fallback para taxa_canonica.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE ativos_canonicos
    ADD COLUMN IF NOT EXISTS taxa_formatada TEXT;

-- Backfill: ponto de partida para canônicos existentes (até o próximo sync popular
-- a versão rica). Usa taxa_canonica e, na falta, o benchmark.
UPDATE ativos_canonicos
SET taxa_formatada = COALESCE(NULLIF(TRIM(taxa_canonica), ''), NULLIF(TRIM(benchmark_canonico), ''))
WHERE taxa_formatada IS NULL;

COMMENT ON COLUMN ativos_canonicos.taxa_formatada IS 'Taxa pronta p/ exibição (TAXA + CUPOM), preenchida no sync via formatarTaxa.';
