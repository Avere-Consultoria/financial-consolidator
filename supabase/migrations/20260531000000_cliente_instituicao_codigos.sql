-- ─────────────────────────────────────────────────────────────────────────────
-- Códigos por cliente × instituição (referência visual do master)
--
-- Para instituições MANUAIS (sem API): o master registra o código da conta do
-- cliente naquela instituição apenas como referência/organização. Não é usado
-- no import (que casa por codigo_avere). Tabela flexível → escala com N instituições.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Marca o tipo da instituição (API | MANUAL)
ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'MANUAL';

-- As 4 conectadas por API ficam como 'API'; o resto (auto-registradas pelo import) MANUAL
UPDATE instituicoes SET tipo = 'API'
WHERE tipo IS DISTINCT FROM 'API' AND (
    nome ILIKE '%btg%'  OR nome ILIKE '%xp%'    OR nome ILIKE '%avenue%'
    OR nome ILIKE '%agora%' OR nome ILIKE '%ágora%'
);

-- 2. Códigos cliente × instituição
CREATE TABLE IF NOT EXISTS cliente_instituicao_codigos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    instituicao_id  UUID NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
    codigo          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (cliente_id, instituicao_id)
);
CREATE INDEX IF NOT EXISTS idx_cic_cliente ON cliente_instituicao_codigos (cliente_id);

ALTER TABLE cliente_instituicao_codigos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_cic"  ON cliente_instituicao_codigos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_cic" ON cliente_instituicao_codigos FOR ALL    TO authenticated USING (true) WITH CHECK (true);
