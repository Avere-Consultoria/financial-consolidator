-- ─────────────────────────────────────────────────────────────────────────────
-- Corrige duplicação de ativos na XP causada por race de sync concorrente.
--
-- Sintoma: cada ativo aparecia 2x no mesmo snapshot (Home somava tudo dobrado).
-- Causa: get-xp-position faz upsert(snapshot) → delete(ativos) → insert(ativos)
--        em 3 passos NÃO atômicos. Duas chamadas simultâneas da mesma conta
--        (front+front ou front+agendado) se intercalam e ambos inserem.
--
-- Fix: (1) remove as duplicatas existentes; (2) índice único impede recorrência —
--      a 2ª sync concorrente bate na constraint e falha limpa, sem duplicar.
-- ─────────────────────────────────────────────────────────────────────────────

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY snapshot_id, nome, valor_bruto,
                        COALESCE(codigo_ativo, ''), COALESCE(isin, '')
           ORDER BY id
         ) AS rn
  FROM posicao_xp_ativos
)
DELETE FROM posicao_xp_ativos
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS posicao_xp_ativos_unq
  ON posicao_xp_ativos (snapshot_id, nome, valor_bruto,
                        COALESCE(codigo_ativo, ''), COALESCE(isin, ''));
