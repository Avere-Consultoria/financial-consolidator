-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 2.5 — Truncate + cleanup destrutivo + schema final
--
-- Aproveitando que os dados atuais são descartáveis (sistema pré-produção):
--   1. TRUNCATE de todas as tabelas de dados (mantém clientes, classes,
--      emissores, instituições, auth — só zera ativos/posições/exceções).
--   2. DROP das colunas redundantes em dicionario_ativos (foram pro canônico).
--   3. DROP de codigo_identificador em excecoes_classificacao (agora usa
--      ativo_canonico_id como referência).
--   4. Reformula UNIQUE de dicionario_ativos para incluir instituicao_origem
--      (cada instituição tem sua visão; canônico aglutina).
--   5. Constraints finais (NOT NULL onde faz sentido).
--   6. Drop de classe_avere de posicao_*_ativos (era materialização antiga
--      que vai morar em posicoes_fechadas no fechamento de mês).
--
-- Após esta migration, o schema está no formato definitivo. F3 escreve
-- Edge Functions e telas direto pro modelo novo, sem retrocompatibilidade.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. TRUNCATE — zera dados de posição/dicionário/exceções
--    NÃO toca: clientes, dicionario_classes, dicionario_emissores,
--               instituicoes, auth.users, profiles
-- ───────────────────────────────────────────────────────────────────────────

TRUNCATE TABLE
    posicoes_fechadas,
    snapshots_fechados,
    posicao_btg_janelas_liquidez,
    posicao_btg_aquisicoes,
    posicao_btg_ativos,
    posicao_btg_snapshots,
    posicao_xp_ativos,
    posicao_xp_snapshots,
    posicao_avenue_ativos,
    posicao_avenue_snapshots,
    posicao_agora_ativos,
    posicao_agora_snapshots,
    excecoes_classificacao,
    dicionario_ativos,
    ativos_canonicos,
    carteiras_personalizadas
RESTART IDENTITY CASCADE;


-- ───────────────────────────────────────────────────────────────────────────
-- 2. dicionario_ativos — drop das colunas que migraram pro canônico
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE dicionario_ativos DROP COLUMN IF EXISTS classe_avere;
ALTER TABLE dicionario_ativos DROP COLUMN IF EXISTS liquidez_avere;
ALTER TABLE dicionario_ativos DROP COLUMN IF EXISTS emissor_id;
ALTER TABLE dicionario_ativos DROP COLUMN IF EXISTS data_vencimento;
ALTER TABLE dicionario_ativos DROP COLUMN IF EXISTS benchmark;


-- ───────────────────────────────────────────────────────────────────────────
-- 3. dicionario_ativos — UNIQUE agora inclui instituicao_origem
--    Permite que cada instituição tenha sua linha apontando para o mesmo
--    ativo_canonico_id (preservando nome/emissor/classe originais por API).
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE dicionario_ativos
    DROP CONSTRAINT IF EXISTS dicionario_ativos_codigo_identificador_tipo_identificador_key;

ALTER TABLE dicionario_ativos
    ADD CONSTRAINT dicionario_ativos_inst_codigo_tipo_key
    UNIQUE (instituicao_origem, codigo_identificador, tipo_identificador);


-- ───────────────────────────────────────────────────────────────────────────
-- 4. dicionario_ativos — campos obrigatórios no modelo novo
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE dicionario_ativos
    ALTER COLUMN ativo_canonico_id SET NOT NULL;

ALTER TABLE dicionario_ativos
    ALTER COLUMN instituicao_origem SET NOT NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 5. excecoes_classificacao — drop codigo_identificador
--    (agora a exceção referencia o ativo via ativo_canonico_id)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE excecoes_classificacao DROP COLUMN IF EXISTS codigo_identificador;

ALTER TABLE excecoes_classificacao
    ALTER COLUMN ativo_canonico_id SET NOT NULL;

-- UNIQUE: garante 1 exceção global por (consultor, canônico) E 1 por (consultor, canônico, cliente)
-- Usando partial unique indexes para tratar NULL corretamente (NULL = NULL na unicidade)
DROP INDEX IF EXISTS excecoes_global_unique;
DROP INDEX IF EXISTS excecoes_cliente_unique;

CREATE UNIQUE INDEX excecoes_global_unique
    ON excecoes_classificacao (consultor_id, ativo_canonico_id)
    WHERE cliente_id IS NULL;

CREATE UNIQUE INDEX excecoes_cliente_unique
    ON excecoes_classificacao (consultor_id, ativo_canonico_id, cliente_id)
    WHERE cliente_id IS NOT NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 6. posicao_*_ativos — drop classe_avere
--    (era materialização antiga; classe final vem do canônico em tempo real
--     durante o mês corrente, e do posicoes_fechadas no histórico)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE posicao_btg_ativos    DROP COLUMN IF EXISTS classe_avere;
ALTER TABLE posicao_xp_ativos     DROP COLUMN IF EXISTS classe_avere;
ALTER TABLE posicao_avenue_ativos DROP COLUMN IF EXISTS classe_avere;
ALTER TABLE posicao_agora_ativos  DROP COLUMN IF EXISTS classe_avere;


-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO
--
--   -- A. Tabelas zeradas
--   SELECT 'dicionario_ativos' AS t, COUNT(*) FROM dicionario_ativos
--   UNION ALL SELECT 'ativos_canonicos', COUNT(*) FROM ativos_canonicos
--   UNION ALL SELECT 'excecoes', COUNT(*) FROM excecoes_classificacao
--   UNION ALL SELECT 'btg_ativos', COUNT(*) FROM posicao_btg_ativos
--   UNION ALL SELECT 'btg_snapshots', COUNT(*) FROM posicao_btg_snapshots
--   UNION ALL SELECT 'xp_ativos', COUNT(*) FROM posicao_xp_ativos
--   UNION ALL SELECT 'avenue_ativos', COUNT(*) FROM posicao_avenue_ativos
--   UNION ALL SELECT 'agora_ativos', COUNT(*) FROM posicao_agora_ativos
--   UNION ALL SELECT 'snapshots_fechados', COUNT(*) FROM snapshots_fechados;
--   -- Esperado: tudo 0
--
--   -- B. Tabelas preservadas
--   SELECT 'clientes' AS t, COUNT(*) FROM clientes
--   UNION ALL SELECT 'classes', COUNT(*) FROM dicionario_classes
--   UNION ALL SELECT 'emissores', COUNT(*) FROM dicionario_emissores
--   UNION ALL SELECT 'instituicoes', COUNT(*) FROM instituicoes;
--   -- Esperado: contagens > 0
--
--   -- C. Schema final de dicionario_ativos (não deve ter classe_avere, liquidez_avere, emissor_id, data_vencimento, benchmark)
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'dicionario_ativos' ORDER BY ordinal_position;
--
--   -- D. Schema final de excecoes_classificacao (não deve ter codigo_identificador)
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'excecoes_classificacao' ORDER BY ordinal_position;
--
--   -- E. UNIQUE de dicionario_ativos (deve ser instituicao_origem, codigo_identificador, tipo_identificador)
--   SELECT constraint_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS colunas
--   FROM information_schema.table_constraints tc
--   JOIN information_schema.key_column_usage kcu USING (constraint_name)
--   WHERE tc.table_name = 'dicionario_ativos' AND tc.constraint_type = 'UNIQUE'
--   GROUP BY constraint_name;
-- ═══════════════════════════════════════════════════════════════════════════
