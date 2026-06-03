-- ─────────────────────────────────────────────────────────────────────────────
-- BCB: Porte (segmentação S1–S5) e CNPJ das instituições
-- Fontes:
--   • Instituições em Funcionamento (OData)  → nome legal completo + CNPJ
--   • IF.data Cadastro (OData)                → segmento Sr (S1–S5) por conglomerado prudencial
-- Ponte: FGC (nome completo) ↔ BCB (nome completo) → CNPJ → Sr
-- ─────────────────────────────────────────────────────────────────────────────

-- Espelho das instituições do BCB (catálogo bruto, reutilizável p/ auto-classify futuro)
CREATE TABLE IF NOT EXISTS bcb_instituicoes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj                TEXT NOT NULL,                 -- CNPJ raiz (8 dígitos)
    nome_instituicao    TEXT NOT NULL,                 -- nome legal completo
    nome_normalizado    TEXT NOT NULL,                 -- p/ match (sem acento, upper, sem pontuação)
    segmento            TEXT,                          -- descritivo ("Banco Múltiplo", "SCD"…)
    sr                  TEXT,                          -- S1–S5 (do IF.data, quando aplicável)
    cod_conglomerado_prudencial TEXT,
    cnpj_lider          TEXT,                          -- CNPJ raiz do líder prudencial
    tcb                 TEXT,                          -- tipo consolidado bancário (B1…)
    fonte               TEXT NOT NULL,                 -- BANCO | SOCIEDADE | COOPERATIVA
    situacao            TEXT,
    last_seen_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (cnpj)
);

CREATE INDEX IF NOT EXISTS idx_bcb_inst_nomenorm ON bcb_instituicoes (nome_normalizado);
CREATE INDEX IF NOT EXISTS idx_bcb_inst_cnpjlider ON bcb_instituicoes (cnpj_lider);

-- Enriquecimento dos conglomerados FGC com porte + CNPJ do líder
ALTER TABLE dicionario_conglomerados
    ADD COLUMN IF NOT EXISTS porte        TEXT,        -- S1–S5
    ADD COLUMN IF NOT EXISTS porte_origem TEXT,        -- AUTO_BCB | MANUAL
    ADD COLUMN IF NOT EXISTS cnpj         TEXT;        -- CNPJ raiz do líder (via BCB)

-- Enriquecimento das instituições FGC com CNPJ (alimenta auto-classify de ativos)
ALTER TABLE instituicoes_fgc
    ADD COLUMN IF NOT EXISTS cnpj             TEXT,
    ADD COLUMN IF NOT EXISTS bcb_match_score  NUMERIC;  -- confiança do match de nome (0–1)

CREATE INDEX IF NOT EXISTS idx_inst_fgc_cnpj ON instituicoes_fgc (cnpj);

-- Log de sincronizações BCB
CREATE TABLE IF NOT EXISTS bcb_sync_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    finished_at         TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'running',
    anomes_ifdata       TEXT,                          -- data-base usada no IF.data
    total_bcb_inst      INT DEFAULT 0,
    conglom_com_porte   INT DEFAULT 0,
    inst_com_cnpj       INT DEFAULT 0,
    erro                TEXT
);

-- RLS
ALTER TABLE bcb_instituicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcb_sync_log      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_bcb"      ON bcb_instituicoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_bcb"     ON bcb_instituicoes FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_bcblog"   ON bcb_sync_log     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_bcblog"  ON bcb_sync_log     FOR ALL    TO authenticated USING (true) WITH CHECK (true);
