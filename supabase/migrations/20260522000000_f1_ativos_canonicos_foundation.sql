-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 1 — Fundação do modelo canônico de ativos
--
-- Esta migration é 100% ADITIVA: cria estruturas novas e adiciona colunas
-- nullable nas tabelas existentes. Não remove nada, não altera dados.
--
-- Após rodar, o sistema atual continua funcionando exatamente como antes.
-- O backfill (Fase 2) é uma migration separada.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. ativos_canonicos — verdade da Avere sobre cada ativo do mundo real
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ativos_canonicos (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identidade
    nome_canonico       text NOT NULL,
    sub_tipo_canonico   text,

    -- Classificação Avere (preenchidas pelo Master)
    classe_avere        text,
    liquidez_avere      text,
    emissor_id          uuid REFERENCES dicionario_emissores(id),
    data_vencimento     date,

    -- Taxa e benchmark (formatados para exibição)
    taxa_canonica       text,
    benchmark_canonico  text,

    -- Flags
    is_fii              boolean NOT NULL DEFAULT false,
    is_coe              boolean NOT NULL DEFAULT false,

    -- Operacional
    notas               text,
    criado_em           timestamptz NOT NULL DEFAULT now(),
    atualizado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ativos_canonicos_classe         ON ativos_canonicos(classe_avere);
CREATE INDEX IF NOT EXISTS idx_ativos_canonicos_emissor        ON ativos_canonicos(emissor_id);
CREATE INDEX IF NOT EXISTS idx_ativos_canonicos_pendentes      ON ativos_canonicos(classe_avere) WHERE classe_avere IS NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 2. dicionario_ativos — adiciona FK para canônico
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE dicionario_ativos
    ADD COLUMN IF NOT EXISTS ativo_canonico_id uuid REFERENCES ativos_canonicos(id);

CREATE INDEX IF NOT EXISTS idx_dicionario_ativos_canonico ON dicionario_ativos(ativo_canonico_id);


-- ───────────────────────────────────────────────────────────────────────────
-- 3. excecoes_classificacao — adiciona colunas faltantes + FK pro canônico
--    (corrige a migration #3 que tinha sido escrita mas não aplicada)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE excecoes_classificacao
    ADD COLUMN IF NOT EXISTS vencimento_customizado  date,
    ADD COLUMN IF NOT EXISTS emissor_customizado_id  uuid REFERENCES dicionario_emissores(id),
    ADD COLUMN IF NOT EXISTS ativo_canonico_id       uuid REFERENCES ativos_canonicos(id);

CREATE INDEX IF NOT EXISTS idx_excecoes_canonico ON excecoes_classificacao(ativo_canonico_id);


-- ───────────────────────────────────────────────────────────────────────────
-- 4. posicao_*_ativos — adiciona FK para canônico em todas as 4 instituições
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE posicao_btg_ativos
    ADD COLUMN IF NOT EXISTS ativo_canonico_id uuid REFERENCES ativos_canonicos(id);

ALTER TABLE posicao_xp_ativos
    ADD COLUMN IF NOT EXISTS ativo_canonico_id uuid REFERENCES ativos_canonicos(id);

ALTER TABLE posicao_avenue_ativos
    ADD COLUMN IF NOT EXISTS ativo_canonico_id uuid REFERENCES ativos_canonicos(id);

ALTER TABLE posicao_agora_ativos
    ADD COLUMN IF NOT EXISTS ativo_canonico_id uuid REFERENCES ativos_canonicos(id);

CREATE INDEX IF NOT EXISTS idx_posicao_btg_ativos_canonico    ON posicao_btg_ativos(ativo_canonico_id);
CREATE INDEX IF NOT EXISTS idx_posicao_xp_ativos_canonico     ON posicao_xp_ativos(ativo_canonico_id);
CREATE INDEX IF NOT EXISTS idx_posicao_avenue_ativos_canonico ON posicao_avenue_ativos(ativo_canonico_id);
CREATE INDEX IF NOT EXISTS idx_posicao_agora_ativos_canonico  ON posicao_agora_ativos(ativo_canonico_id);


-- ───────────────────────────────────────────────────────────────────────────
-- 5. posicao_*_snapshots — separar data_referencia (foto real) de
--    data_sincronizacao (quando rodamos o sync)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE posicao_btg_snapshots
    ADD COLUMN IF NOT EXISTS data_sincronizacao timestamptz;

ALTER TABLE posicao_xp_snapshots
    ADD COLUMN IF NOT EXISTS data_sincronizacao timestamptz;

ALTER TABLE posicao_avenue_snapshots
    ADD COLUMN IF NOT EXISTS data_sincronizacao timestamptz;

ALTER TABLE posicao_agora_snapshots
    ADD COLUMN IF NOT EXISTS data_sincronizacao timestamptz;


-- ───────────────────────────────────────────────────────────────────────────
-- 6. snapshots_fechados — registros de fim de mês (1 linha por
--    cliente × instituição × mês_referencia)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS snapshots_fechados (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    cliente_id                  uuid NOT NULL REFERENCES clientes(id),
    instituicao                 text NOT NULL,           -- BTG / XP / AVENUE / AGORA
    mes_referencia              text NOT NULL,           -- "YYYY-MM"
    data_referencia             date NOT NULL,           -- foto real escolhida (ex: 29/10)

    -- Aponta para o snapshot vivo de origem (pode ser deletado depois — informacional)
    snapshot_origem_id          uuid,

    -- Total agregado
    patrimonio_total            numeric NOT NULL,

    -- Materialização do fechamento
    frozen_at                   timestamptz NOT NULL DEFAULT now(),
    frozen_by                   uuid,                    -- consultor que fechou

    created_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_snapshot_fechado_cliente_inst_mes
        UNIQUE (cliente_id, instituicao, mes_referencia),
    CONSTRAINT chk_instituicao_valida
        CHECK (instituicao IN ('BTG', 'XP', 'AVENUE', 'AGORA'))
);

CREATE INDEX IF NOT EXISTS idx_snapshots_fechados_cliente_mes
    ON snapshots_fechados(cliente_id, mes_referencia);


-- ───────────────────────────────────────────────────────────────────────────
-- 7. posicoes_fechadas — linhas individuais dos ativos materializados
--    Tabela única, schema uniforme entre todas as instituições
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posicoes_fechadas (
    id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    snapshot_fechado_id             uuid NOT NULL REFERENCES snapshots_fechados(id) ON DELETE CASCADE,
    ativo_canonico_id               uuid REFERENCES ativos_canonicos(id),

    -- Carimbo da classificação no momento do fechamento
    nome_exibicao                   text,                -- apelido > nome canônico > nome API
    classe_avere                    text,
    liquidez_avere                  text,
    emissor_id                      uuid,                -- snapshot do emissor da época
    emissor_nome                    text,                -- denormalizado (emissor pode renomear)
    data_vencimento                 date,
    taxa                            text,
    benchmark                       text,

    -- Dados da posição
    valor_bruto                     numeric NOT NULL,
    valor_liquido                   numeric,
    quantidade                      numeric,
    preco_mercado                   numeric,

    -- Origem (audit trail)
    instituicao                     text NOT NULL,
    codigo_identificador_origem     text,
    tipo_identificador_origem       text,

    created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posicoes_fechadas_snapshot   ON posicoes_fechadas(snapshot_fechado_id);
CREATE INDEX IF NOT EXISTS idx_posicoes_fechadas_canonico   ON posicoes_fechadas(ativo_canonico_id);
CREATE INDEX IF NOT EXISTS idx_posicoes_fechadas_classe     ON posicoes_fechadas(classe_avere);


-- ───────────────────────────────────────────────────────────────────────────
-- 8. Trigger para manter atualizado_em
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_atualizado_em() RETURNS trigger AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ativos_canonicos_touch ON ativos_canonicos;
CREATE TRIGGER trg_ativos_canonicos_touch
    BEFORE UPDATE ON ativos_canonicos
    FOR EACH ROW EXECUTE FUNCTION touch_atualizado_em();


-- ═══════════════════════════════════════════════════════════════════════════
-- Fim da Fase 1.
--
-- Validação sugerida após rodar:
--
--   SELECT COUNT(*) FROM ativos_canonicos;                       -- = 0
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'excecoes_classificacao';               -- deve ter vencimento_customizado, emissor_customizado_id, ativo_canonico_id
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'posicao_btg_snapshots';                -- deve ter data_sincronizacao
--   SELECT * FROM snapshots_fechados LIMIT 1;                    -- tabela existe (vazia)
--   SELECT * FROM posicoes_fechadas LIMIT 1;                     -- tabela existe (vazia)
-- ═══════════════════════════════════════════════════════════════════════════
