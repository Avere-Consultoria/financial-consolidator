-- ─────────────────────────────────────────────────────────────────────────────
-- Multi-conta no import manual: posicao_manual_snapshots ganha conta_id.
-- Permite 2+ contas na MESMA instituição manual (ex.: dois cadastros Santander).
-- O import resolve a conta por (instituição, codigo_conta); sem código → primária.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE posicao_manual_snapshots
    ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES cliente_contas(id) ON DELETE CASCADE;

-- Backfill: conta primária (menor ordem) da instituição manual daquele cliente
UPDATE posicao_manual_snapshots s SET conta_id = (
    SELECT cc.id FROM cliente_contas cc
    JOIN instituicoes i ON i.id = cc.instituicao_id
    WHERE cc.cliente_id = s.cliente_id AND i.nome = s.instituicao
    ORDER BY cc.ordem, cc.created_at LIMIT 1
) WHERE s.conta_id IS NULL;

-- Troca a unicidade: (cliente, instituicao, data) → (cliente, conta_id, data)
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT conname FROM pg_constraint
        WHERE conrelid = 'posicao_manual_snapshots'::regclass AND contype = 'u'
          AND pg_get_constraintdef(oid) ILIKE '%instituicao%'
    LOOP
        EXECUTE 'ALTER TABLE posicao_manual_snapshots DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'posicao_manual_snapshots'::regclass AND conname = 'posicao_manual_snapshots_conta_data_uq'
    ) THEN
        ALTER TABLE posicao_manual_snapshots
            ADD CONSTRAINT posicao_manual_snapshots_conta_data_uq UNIQUE (cliente_id, conta_id, data_referencia);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pms_conta ON posicao_manual_snapshots (conta_id);
