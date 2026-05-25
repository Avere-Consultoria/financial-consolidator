-- ═══════════════════════════════════════════════════════════════════════════
-- Limpa "NaN" e outros valores não-numéricos em liquidez_avere
--
-- Causa: suggestLiquidezAvere recebia maturityDate em formatos imprevistos
-- (ex: "20270101" da Ágora), gerando NaN no cálculo. A função foi blindada,
-- mas valores antigos já gravados precisam de limpeza.
--
-- Limpa em:
--   - ativos_canonicos.liquidez_avere
--   - excecoes_classificacao.liquidez_customizada  (defensivo, improvável ter)
--   - posicoes_fechadas.liquidez_avere             (snapshots fechados)
-- ═══════════════════════════════════════════════════════════════════════════

-- ativos_canonicos: valor curado mestre
UPDATE ativos_canonicos
SET liquidez_avere = NULL
WHERE liquidez_avere IS NOT NULL
  AND liquidez_avere !~ '^\d+$';   -- mantém apenas inteiros não-negativos

-- excecoes_classificacao
UPDATE excecoes_classificacao
SET liquidez_customizada = NULL
WHERE liquidez_customizada IS NOT NULL
  AND liquidez_customizada !~ '^\d+$';

-- posicoes_fechadas: histórico imutável (mas se tem NaN é lixo carimbado)
UPDATE posicoes_fechadas
SET liquidez_avere = NULL
WHERE liquidez_avere IS NOT NULL
  AND liquidez_avere !~ '^\d+$';
