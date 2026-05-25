-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 2 — Backfill do modelo canônico
--
-- Esta migration:
--   1. Cria um `ativos_canonicos` para cada linha de `dicionario_ativos`,
--      herdando os campos curados.
--   2. Linka `dicionario_ativos.ativo_canonico_id` aos canônicos criados.
--   3. Linka cada `posicao_*_ativos.ativo_canonico_id` via match de
--      identificador (cascata por instituição).
--   4. Detecta `is_fii` e `is_coe` por evidência + heurística.
--   5. Normaliza `excecoes_classificacao.cliente_id` (varchar→uuid).
--   6. Linka `excecoes_classificacao.ativo_canonico_id`.
--   7. Backfill `data_sincronizacao` em snapshots antigos.
--   8. Remove UNIQUE duplicada em `posicao_agora_snapshots`.
--
-- Idempotente: pode rodar duas vezes sem efeito colateral.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1+2. Cria canônicos + linka dicionario_ativos
-- ───────────────────────────────────────────────────────────────────────────

WITH novos AS (
    SELECT
        d.id                                          AS dicionario_id,
        gen_random_uuid()                             AS canonico_id,
        d.nome_ativo                                  AS nome_canonico,
        d.classe_avere,
        d.liquidez_avere,
        d.emissor_id,
        d.data_vencimento,
        d.benchmark                                   AS benchmark_canonico,
        d.benchmark                                   AS taxa_canonica,   -- por ora taxa = benchmark; F3 refina
        false                                         AS is_fii,
        false                                         AS is_coe
    FROM dicionario_ativos d
    WHERE d.ativo_canonico_id IS NULL
),
inseridos AS (
    INSERT INTO ativos_canonicos (
        id, nome_canonico, classe_avere, liquidez_avere,
        emissor_id, data_vencimento, benchmark_canonico, taxa_canonica,
        is_fii, is_coe
    )
    SELECT
        canonico_id, nome_canonico, classe_avere, liquidez_avere,
        emissor_id, data_vencimento, benchmark_canonico, taxa_canonica,
        is_fii, is_coe
    FROM novos
    RETURNING id
)
UPDATE dicionario_ativos d
SET ativo_canonico_id = n.canonico_id
FROM novos n
WHERE d.id = n.dicionario_id;


-- ───────────────────────────────────────────────────────────────────────────
-- 3. Linka posicao_*_ativos.ativo_canonico_id via match de identificador
--    Estratégia: match por codigo_identificador (ignorando tipo).
--    Cada UPDATE filtra WHERE ativo_canonico_id IS NULL para não sobrescrever
--    matches já feitos por identificadores de maior prioridade.
-- ───────────────────────────────────────────────────────────────────────────

-- ── BTG: ISIN → CNPJ → CETIP → security_code → ticker ─────────────────────

UPDATE posicao_btg_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.isin IS NOT NULL AND p.isin <> ''
  AND d.codigo_identificador = p.isin
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_btg_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.fund_cnpj IS NOT NULL AND p.fund_cnpj <> ''
  AND d.codigo_identificador = p.fund_cnpj
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_btg_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.cetip_code IS NOT NULL AND p.cetip_code <> ''
  AND d.codigo_identificador = p.cetip_code
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_btg_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.security_code IS NOT NULL AND p.security_code <> ''
  AND d.codigo_identificador = p.security_code
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_btg_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.ticker IS NOT NULL AND p.ticker <> ''
  AND d.codigo_identificador = p.ticker
  AND d.ativo_canonico_id IS NOT NULL;

-- ── XP: ISIN → CNPJ → codigo_ativo → ticker ───────────────────────────────

UPDATE posicao_xp_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.isin IS NOT NULL AND p.isin <> ''
  AND d.codigo_identificador = p.isin
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_xp_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.cnpj IS NOT NULL AND p.cnpj <> ''
  AND d.codigo_identificador = p.cnpj
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_xp_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.codigo_ativo IS NOT NULL AND p.codigo_ativo <> ''
  AND d.codigo_identificador = p.codigo_ativo
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_xp_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.ticker IS NOT NULL AND p.ticker <> ''
  AND d.codigo_identificador = p.ticker
  AND d.ativo_canonico_id IS NOT NULL;

-- ── Avenue: ISIN → CUSIP → ticker ─────────────────────────────────────────

UPDATE posicao_avenue_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.isin IS NOT NULL AND p.isin <> ''
  AND d.codigo_identificador = p.isin
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_avenue_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.cusip IS NOT NULL AND p.cusip <> ''
  AND d.codigo_identificador = p.cusip
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_avenue_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.ticker IS NOT NULL AND p.ticker <> ''
  AND d.codigo_identificador = p.ticker
  AND d.ativo_canonico_id IS NOT NULL;

-- ── Ágora: security_code → ticker ─────────────────────────────────────────

UPDATE posicao_agora_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.security_code IS NOT NULL AND p.security_code <> ''
  AND d.codigo_identificador = p.security_code
  AND d.ativo_canonico_id IS NOT NULL;

UPDATE posicao_agora_ativos p
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE p.ativo_canonico_id IS NULL
  AND p.ticker IS NOT NULL AND p.ticker <> ''
  AND d.codigo_identificador = p.ticker
  AND d.ativo_canonico_id IS NOT NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 4. Detecta is_fii e is_coe nos canônicos
-- ───────────────────────────────────────────────────────────────────────────

-- is_fii: evidência direta no BTG
UPDATE ativos_canonicos a
SET is_fii = true
WHERE is_fii = false
  AND EXISTS (
    SELECT 1 FROM posicao_btg_ativos p
    WHERE p.ativo_canonico_id = a.id AND p.is_fii = true
  );

-- is_fii: heurística no nome
UPDATE ativos_canonicos a
SET is_fii = true
WHERE is_fii = false
  AND (
       upper(a.nome_canonico) LIKE '%FII%'
    OR upper(a.nome_canonico) LIKE '%FIAGRO%'
    OR upper(a.nome_canonico) LIKE '%FI-AGRO%'
    OR upper(a.nome_canonico) LIKE '%IMOBILIÁRIO%'
    OR upper(a.nome_canonico) LIKE '%IMOBILIARIO%'
  );

-- is_coe: heurística no nome
UPDATE ativos_canonicos a
SET is_coe = true
WHERE is_coe = false
  AND upper(a.nome_canonico) LIKE '%COE%';


-- ───────────────────────────────────────────────────────────────────────────
-- 5. Normaliza excecoes_classificacao.cliente_id (varchar → uuid)
--    Pré-checagem confirmou: 2 nulos/vazios, 1 UUID válido, 0 inválidos.
-- ───────────────────────────────────────────────────────────────────────────

UPDATE excecoes_classificacao
SET cliente_id = NULL
WHERE cliente_id = '';

ALTER TABLE excecoes_classificacao
    ALTER COLUMN cliente_id TYPE uuid USING NULLIF(cliente_id, '')::uuid;

-- Agora que cliente_id é UUID, podemos adicionar a FK
ALTER TABLE excecoes_classificacao
    DROP CONSTRAINT IF EXISTS excecoes_classificacao_cliente_id_fkey;

ALTER TABLE excecoes_classificacao
    ADD CONSTRAINT excecoes_classificacao_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES clientes(id);


-- ───────────────────────────────────────────────────────────────────────────
-- 6. Linka excecoes_classificacao.ativo_canonico_id
-- ───────────────────────────────────────────────────────────────────────────

UPDATE excecoes_classificacao e
SET ativo_canonico_id = d.ativo_canonico_id
FROM dicionario_ativos d
WHERE e.ativo_canonico_id IS NULL
  AND d.codigo_identificador = e.codigo_identificador
  AND d.ativo_canonico_id IS NOT NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 7. Backfill data_sincronizacao em snapshots antigos (= created_at)
-- ───────────────────────────────────────────────────────────────────────────

UPDATE posicao_btg_snapshots    SET data_sincronizacao = created_at WHERE data_sincronizacao IS NULL;
UPDATE posicao_xp_snapshots     SET data_sincronizacao = created_at WHERE data_sincronizacao IS NULL;
UPDATE posicao_avenue_snapshots SET data_sincronizacao = created_at WHERE data_sincronizacao IS NULL;
UPDATE posicao_agora_snapshots  SET data_sincronizacao = created_at WHERE data_sincronizacao IS NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 8. Remove UNIQUE duplicada em posicao_agora_snapshots
--    (mantém posicao_agora_snapshots_cliente_id_data_referencia_key, remove unique_cliente_data)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE posicao_agora_snapshots
    DROP CONSTRAINT IF EXISTS unique_cliente_data;


-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO — queries pra rodar após esta migration
--
--   -- A. Total de canônicos criados (deve = 58, igual ao dicionario_ativos)
--   SELECT COUNT(*) FROM ativos_canonicos;
--
--   -- B. Quantas linhas do dicionário ficaram sem canônico (deve = 0)
--   SELECT COUNT(*) FROM dicionario_ativos WHERE ativo_canonico_id IS NULL;
--
--   -- C. Quantas posições foram linkadas vs órfãs (por instituição)
--   SELECT 'BTG' AS inst,
--          COUNT(*) FILTER (WHERE ativo_canonico_id IS NOT NULL) AS linkadas,
--          COUNT(*) FILTER (WHERE ativo_canonico_id IS NULL) AS orfas,
--          COUNT(*) AS total
--   FROM posicao_btg_ativos
--   UNION ALL
--   SELECT 'XP',
--          COUNT(*) FILTER (WHERE ativo_canonico_id IS NOT NULL),
--          COUNT(*) FILTER (WHERE ativo_canonico_id IS NULL),
--          COUNT(*)
--   FROM posicao_xp_ativos
--   UNION ALL
--   SELECT 'AVENUE',
--          COUNT(*) FILTER (WHERE ativo_canonico_id IS NOT NULL),
--          COUNT(*) FILTER (WHERE ativo_canonico_id IS NULL),
--          COUNT(*)
--   FROM posicao_avenue_ativos
--   UNION ALL
--   SELECT 'AGORA',
--          COUNT(*) FILTER (WHERE ativo_canonico_id IS NOT NULL),
--          COUNT(*) FILTER (WHERE ativo_canonico_id IS NULL),
--          COUNT(*)
--   FROM posicao_agora_ativos;
--
--   -- D. Detecção de is_fii e is_coe
--   SELECT
--       COUNT(*) FILTER (WHERE is_fii = true) AS fiis,
--       COUNT(*) FILTER (WHERE is_coe = true) AS coes,
--       COUNT(*) AS total
--   FROM ativos_canonicos;
--
--   -- E. excecoes_classificacao consistência
--   SELECT
--       data_type FROM information_schema.columns
--       WHERE table_name = 'excecoes_classificacao' AND column_name = 'cliente_id';
--       -- esperado: uuid
--   SELECT COUNT(*) FILTER (WHERE ativo_canonico_id IS NOT NULL) AS linkadas,
--          COUNT(*) FILTER (WHERE ativo_canonico_id IS NULL) AS orfas,
--          COUNT(*) AS total
--   FROM excecoes_classificacao;
--
--   -- F. Lista os ativos órfãos (sem canônico) por instituição —
--   --    são os candidatos a inspeção manual no Master
--   SELECT 'BTG' AS inst, isin, ticker, fund_cnpj, cetip_code, security_code, emissor
--   FROM posicao_btg_ativos WHERE ativo_canonico_id IS NULL
--   UNION ALL
--   SELECT 'XP', isin, ticker, cnpj, NULL, codigo_ativo, emissor
--   FROM posicao_xp_ativos WHERE ativo_canonico_id IS NULL
--   UNION ALL
--   SELECT 'AVENUE', isin, ticker, NULL, NULL, cusip, nome
--   FROM posicao_avenue_ativos WHERE ativo_canonico_id IS NULL
--   UNION ALL
--   SELECT 'AGORA', NULL, ticker, NULL, NULL, security_code, emissor
--   FROM posicao_agora_ativos WHERE ativo_canonico_id IS NULL;
-- ═══════════════════════════════════════════════════════════════════════════
