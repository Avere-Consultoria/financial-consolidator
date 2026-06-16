-- ─────────────────────────────────────────────────────────────────────────────
-- Cerca a race de sync concorrente em BTG / Ágora / Avenue (mesmo padrão da XP,
-- migration 20260624). As Edge Functions gravam ativos em 3 passos NÃO atômicos
-- (upsert snapshot → delete ativos → insert ativos); duas chamadas simultâneas da
-- mesma conta (ex.: Sincronização em Massa + sync manual) podem intercalar e
-- inserir os ativos 2x no mesmo snapshot.
--
-- Fix por tabela: (1) remove duplicatas byte-idênticas existentes; (2) índice único
-- impede recorrência — a 2ª sync concorrente bate na constraint e falha limpa.
--
-- Chaves LARGAS de propósito: multi-aporte vive em posicao_*_aquisicoes (linhas
-- filhas), então há 1 linha de ativo por security. Incluir emissor/nome + todos os
-- identificadores + vencimento + valores garante colapsar só cópias idênticas da
-- race, nunca holdings distintos.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── BTG ──────────────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY snapshot_id,
                        COALESCE(emissor, ''), COALESCE(isin, ''), COALESCE(ticker, ''),
                        COALESCE(codigo, ''), COALESCE(sub_tipo, ''),
                        COALESCE(maturity_date, DATE '1900-01-01'),
                        valor_bruto, valor_liquido
           ORDER BY id
         ) AS rn
  FROM posicao_btg_ativos
)
DELETE FROM posicao_btg_ativos
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS posicao_btg_ativos_unq
  ON posicao_btg_ativos (snapshot_id,
                         COALESCE(emissor, ''), COALESCE(isin, ''), COALESCE(ticker, ''),
                         COALESCE(codigo, ''), COALESCE(sub_tipo, ''),
                         COALESCE(maturity_date, DATE '1900-01-01'),
                         valor_bruto, valor_liquido);

-- ── Ágora ────────────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY snapshot_id,
                        COALESCE(emissor, ''), COALESCE(security_code, ''), COALESCE(ticker, ''),
                        COALESCE(sub_tipo, ''),
                        COALESCE(data_vencimento, DATE '1900-01-01'),
                        valor_bruto, valor_liquido
           ORDER BY id
         ) AS rn
  FROM posicao_agora_ativos
)
DELETE FROM posicao_agora_ativos
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS posicao_agora_ativos_unq
  ON posicao_agora_ativos (snapshot_id,
                           COALESCE(emissor, ''), COALESCE(security_code, ''), COALESCE(ticker, ''),
                           COALESCE(sub_tipo, ''),
                           COALESCE(data_vencimento, DATE '1900-01-01'),
                           valor_bruto, valor_liquido);

-- ── Avenue ───────────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY snapshot_id,
                        COALESCE(nome, ''), COALESCE(isin, ''), COALESCE(cusip, ''),
                        COALESCE(ticker, ''), COALESCE(sub_tipo, ''),
                        COALESCE(maturity_date, DATE '1900-01-01'),
                        valor_bruto_brl
           ORDER BY id
         ) AS rn
  FROM posicao_avenue_ativos
)
DELETE FROM posicao_avenue_ativos
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS posicao_avenue_ativos_unq
  ON posicao_avenue_ativos (snapshot_id,
                            COALESCE(nome, ''), COALESCE(isin, ''), COALESCE(cusip, ''),
                            COALESCE(ticker, ''), COALESCE(sub_tipo, ''),
                            COALESCE(maturity_date, DATE '1900-01-01'),
                            valor_bruto_brl);
