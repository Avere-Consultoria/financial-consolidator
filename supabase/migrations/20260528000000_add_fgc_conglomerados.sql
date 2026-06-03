-- ─────────────────────────────────────────────────────────────────────────────
-- FGC: Conglomerados e Instituições Associadas
-- Fonte: https://www.fgc.org.br/instituicoes-associadas-e-conglomerados
-- ─────────────────────────────────────────────────────────────────────────────

-- Conglomerado financeiro (instituição-líder no FGC)
CREATE TABLE IF NOT EXISTS dicionario_conglomerados (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_lider      TEXT NOT NULL UNIQUE,        -- NOMEINSTITUICAOLIDER no FGC
    nome_fantasia   TEXT,                        -- nome curto editável manualmente
    observacoes     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Instituições membro do FGC (espelho da lista oficial)
CREATE TABLE IF NOT EXISTS instituicoes_fgc (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conglomerado_id     UUID NOT NULL REFERENCES dicionario_conglomerados(id) ON DELETE CASCADE,
    nome_instituicao    TEXT NOT NULL,           -- NOMEINSTITUICAO no FGC
    link_fgc            TEXT,                    -- link p/ ficha no FGC
    titulo              TEXT,                    -- campo "Título" do FGC
    primeira_letra      CHAR(1),                 -- letra do filtro alfabético
    last_seen_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (conglomerado_id, nome_instituicao)
);

CREATE INDEX IF NOT EXISTS idx_inst_fgc_nome    ON instituicoes_fgc (nome_instituicao);
CREATE INDEX IF NOT EXISTS idx_inst_fgc_congl   ON instituicoes_fgc (conglomerado_id);

-- Log de sincronizações
CREATE TABLE IF NOT EXISTS fgc_sync_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    finished_at         TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'running',  -- running | success | error
    total_letras        INT DEFAULT 0,
    total_conglomerados INT DEFAULT 0,
    total_instituicoes  INT DEFAULT 0,
    erro                TEXT
);

-- Ligar emissor → conglomerado (opcional, manual ou via auto-match)
ALTER TABLE dicionario_emissores
    ADD COLUMN IF NOT EXISTS conglomerado_id UUID REFERENCES dicionario_conglomerados(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_emissor_congl ON dicionario_emissores (conglomerado_id);

-- RLS: leitura aberta a authenticated; escrita só por service_role (Edge Function) ou usuários autenticados (UI)
ALTER TABLE dicionario_conglomerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE instituicoes_fgc          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fgc_sync_log              ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_congl"    ON dicionario_conglomerados FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_congl"   ON dicionario_conglomerados FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_inst"     ON instituicoes_fgc         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_inst"    ON instituicoes_fgc         FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_log"      ON fgc_sync_log             FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_log"     ON fgc_sync_log             FOR ALL    TO authenticated USING (true) WITH CHECK (true);
