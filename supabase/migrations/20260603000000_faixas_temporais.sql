-- ─────────────────────────────────────────────────────────────────────────────
-- Faixas temporais configuráveis pelo master (Gestão Master → Faixas)
--   tipo LIQUIDEZ   → gráfico "Perfil de Liquidez" (faixas de D+)
--   tipo VENCIMENTO → gráfico "Agenda de Vencimentos"
-- dias_max NULL = faixa aberta (∞). Os gráficos leem daqui; se vazio, usam default.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faixas_temporais (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo        TEXT NOT NULL CHECK (tipo IN ('LIQUIDEZ', 'VENCIMENTO')),
    label       TEXT NOT NULL,
    dias_min    INT NOT NULL,
    dias_max    INT,                 -- NULL = aberta (∞)
    cor         TEXT NOT NULL DEFAULT '#9CA3AF',
    ordem       INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faixas_tipo ON faixas_temporais (tipo, dias_min);

ALTER TABLE faixas_temporais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_faixas"  ON faixas_temporais FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_faixas" ON faixas_temporais FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- Seed dos defaults (só se a tabela estiver vazia)
INSERT INTO faixas_temporais (tipo, label, dias_min, dias_max, cor, ordem)
SELECT v.tipo, v.label, v.dias_min, v.dias_max, v.cor, v.ordem
FROM (VALUES
    ('LIQUIDEZ',   'D+0',                0,   0,    '#10B981', 1),
    ('LIQUIDEZ',   'D+1–30',             1,   30,   '#0083CB', 2),
    ('LIQUIDEZ',   'D+31–180',           31,  180,  '#06B6D4', 3),
    ('LIQUIDEZ',   'D+181–720',          181, 720,  '#F59E0B', 4),
    ('LIQUIDEZ',   'D+720+',             721, NULL, '#EF4444', 5),
    ('VENCIMENTO', 'Até 30 dias',        0,   30,   '#10B981', 1),
    ('VENCIMENTO', '31 a 90 dias',       31,  90,   '#0083CB', 2),
    ('VENCIMENTO', '91 a 180 dias',      91,  180,  '#06B6D4', 3),
    ('VENCIMENTO', '181 a 365 dias',     181, 365,  '#F59E0B', 4),
    ('VENCIMENTO', 'Acima de 365 dias',  366, NULL, '#EF4444', 5)
) AS v(tipo, label, dias_min, dias_max, cor, ordem)
WHERE NOT EXISTS (SELECT 1 FROM faixas_temporais);
