-- ─────────────────────────────────────────────────────────────────────────────
-- Setores normalizados (crédito privado)
--   Hoje o setor é texto livre em dicionario_emissores.setor → fragmenta o
--   gráfico de Distribuição Setorial. Aqui criamos uma tabela canônica `setores`
--   (lista curada, editável pelo master na Gestão Master) e ligamos via FK.
--   A Home passa a ler o NOME pelo join (single source of truth): renomear um
--   setor reflete em todo lugar. Setor é conceito do mundo crédito privado —
--   no mundo bancário/FGC o setor é sempre "Financeiro".
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS setores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            TEXT NOT NULL UNIQUE,
    cor_hex         TEXT NOT NULL DEFAULT '#9CA3AF',
    ordem_exibicao  INT  NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_setores"  ON setores FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_setores" ON setores FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- FK em dicionario_emissores (não dropa a coluna texto legada `setor` por segurança)
ALTER TABLE dicionario_emissores
    ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES setores(id) ON DELETE SET NULL;

-- ── Seed: lista curada Avere ─────────────────────────────────────────────────
INSERT INTO setores (nome, cor_hex, ordem_exibicao)
SELECT v.nome, v.cor, v.ordem
FROM (VALUES
    ('Energia Elétrica',           '#0083CB',  1),
    ('Saneamento',                 '#00B4D8',  2),
    ('Infraestrutura & Transporte','#8B5CF6',  3),
    ('Financeiro',                 '#EC4899',  4),
    ('Imobiliário',                '#F59E0B',  5),
    ('Agronegócio',                '#10B981',  6),
    ('Varejo & Consumo',           '#EF4444',  7),
    ('Telecomunicações',           '#F97316',  8),
    ('Saúde',                      '#6366F1',  9),
    ('Papel & Celulose',           '#84CC16', 10),
    ('Petróleo & Gás',             '#06B6D4', 11),
    ('Indústria',                  '#A855F7', 12),
    ('Educação',                   '#14B8A6', 13),
    ('Tecnologia',                 '#3B82F6', 14),
    ('Outros',                     '#9CA3AF', 99)
) AS v(nome, cor, ordem)
ON CONFLICT (nome) DO NOTHING;

-- ── Backfill não-lossy do texto livre existente ─────────────────────────────
-- 1. Qualquer setor de texto que NÃO casa com a lista curada vira um setor novo
--    (cor cinza + ordem alta), pro master fundir/renomear depois na aba Setores.
INSERT INTO setores (nome, cor_hex, ordem_exibicao)
SELECT DISTINCT TRIM(e.setor), '#9CA3AF', 90
FROM dicionario_emissores e
WHERE e.setor IS NOT NULL AND TRIM(e.setor) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM setores s WHERE LOWER(TRIM(s.nome)) = LOWER(TRIM(e.setor))
  )
ON CONFLICT (nome) DO NOTHING;

-- 2. Liga cada emissor ao setor canônico por nome normalizado (case-insensitive)
UPDATE dicionario_emissores e
SET setor_id = s.id
FROM setores s
WHERE e.setor IS NOT NULL AND TRIM(e.setor) <> ''
  AND LOWER(TRIM(s.nome)) = LOWER(TRIM(e.setor))
  AND e.setor_id IS NULL;

COMMENT ON COLUMN dicionario_emissores.setor_id IS 'FK para setores (canônico). Fonte de verdade do setor.';
COMMENT ON COLUMN dicionario_emissores.setor    IS 'LEGADO — texto livre antigo. Mantido por segurança; leitura usa setor_id.';
