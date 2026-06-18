-- ═══════════════════════════════════════════════════════════════════════════
-- Biblioteca rica de ativos (Fase 1 — fundação)
--
-- Evolui o `mapa_classificacao` (que só entregava classe) para uma REFERÊNCIA
-- COMPLETA por identificador imutável: classe, benchmark, liquidez, taxa, subtipo
-- e um `detalhes` jsonb para campos específicos do subtipo (gestor, segmento,
-- SUSEP, rating…). Cresce sob demanda conforme os ativos aparecem na base.
--
-- Precedência dos dados-base no `ativos_canonicos` (ver canonico.ts):
--   manual (Master) > BIBLIOTECA (curada) > derivado (classifyAvere/API) > NULL
--
-- Uma tabela só (não uma por subtipo): a riqueza por subtipo mora no `detalhes`
-- jsonb e na UX de curadoria (abas por subtipo). Chave única por identificador.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS biblioteca_ativos (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chave          text NOT NULL,            -- CNPJ (14 díg.), ISIN, ticker, código CETIP/COE, SUSEP
    tipo_chave     text NOT NULL DEFAULT 'CODIGO'
                     CHECK (tipo_chave IN ('CNPJ','ISIN','TICKER','CODIGO','SUSEP')),
    sub_tipo       text,                     -- CDB, CRA, CRI, DEB, FUNDO, FII, PREV… (organiza a curadoria)
    nome_ref       text,
    classe_avere   text,
    benchmark      text,
    liquidez       text,
    taxa_formatada text,
    emissor_ref    text,
    setor_ref      text,
    detalhes       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- campos específicos do subtipo
    fonte          text NOT NULL DEFAULT 'manual',       -- manual | xp | btg | anbima | BASE_2
    notas          text,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (chave)
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_ativos_chave   ON biblioteca_ativos (chave);
CREATE INDEX IF NOT EXISTS idx_biblioteca_ativos_subtipo ON biblioteca_ativos (sub_tipo);

-- Leitura para usuários logados; escrita só via service_role (edge/SQL/curadoria).
ALTER TABLE biblioteca_ativos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_read_biblioteca_ativos" ON biblioteca_ativos;
CREATE POLICY "auth_read_biblioteca_ativos" ON biblioteca_ativos
    FOR SELECT TO authenticated USING (true);

-- ── Dobra o mapa_classificacao existente (classe-only) na biblioteca ─────────
-- (mapa_classificacao é mantido como legado/backup; a curadoria nova vai p/ a biblioteca)
INSERT INTO biblioteca_ativos (chave, tipo_chave, classe_avere, fonte, notas, criado_em)
SELECT chave, tipo_chave, classe_avere, fonte, notas, criado_em
FROM mapa_classificacao
ON CONFLICT (chave) DO NOTHING;

-- ── origem_classificacao agora aceita 'biblioteca' ──────────────────────────
ALTER TABLE ativos_canonicos DROP CONSTRAINT IF EXISTS ativos_canonicos_origem_classificacao_check;
ALTER TABLE ativos_canonicos
    ADD CONSTRAINT ativos_canonicos_origem_classificacao_check
    CHECK (origem_classificacao IN ('manual','mapa','auto','biblioteca'));

COMMENT ON COLUMN ativos_canonicos.origem_classificacao IS
    'manual=Master via UI | biblioteca=referência curada | mapa=legado | auto=regra de certeza | NULL=a classificar';
