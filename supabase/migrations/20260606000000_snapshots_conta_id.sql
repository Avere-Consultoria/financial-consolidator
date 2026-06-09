-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 2 — conta_id nos snapshots de posição (API)
--
-- Cada snapshot passa a pertencer a uma CONTA (cliente_contas), não só ao cliente.
-- Assim um cliente com 3 contas XP tem 3 snapshots distintos no mesmo dia.
-- Troca a unicidade de (cliente_id, data_referencia) → (cliente_id, conta_id, data_referencia).
--
-- O snapshot manual (posicao_manual_snapshots) fica para a Fase 4.
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove constraints/índices únicos antigos em (cliente_id, data_referencia) sem conta_id
CREATE OR REPLACE FUNCTION _drop_cliente_data_unique(tbl regclass) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
    FOR r IN SELECT conname FROM pg_constraint
        WHERE conrelid = tbl AND contype = 'u'
          AND pg_get_constraintdef(oid) ILIKE '%cliente_id%'
          AND pg_get_constraintdef(oid) ILIKE '%data_referencia%'
          AND pg_get_constraintdef(oid) NOT ILIKE '%conta_id%'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', tbl, r.conname);
    END LOOP;

    FOR r IN SELECT c.relname AS iname FROM pg_index ix
        JOIN pg_class c ON c.oid = ix.indexrelid
        WHERE ix.indrelid = tbl AND ix.indisunique AND NOT ix.indisprimary
          AND pg_get_indexdef(ix.indexrelid) ILIKE '%cliente_id%'
          AND pg_get_indexdef(ix.indexrelid) ILIKE '%data_referencia%'
          AND pg_get_indexdef(ix.indexrelid) NOT ILIKE '%conta_id%'
          AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conindid = ix.indexrelid)
    LOOP
        EXECUTE format('DROP INDEX %I', r.iname);
    END LOOP;
END $$;

-- Aplica em cada tabela: adiciona conta_id, faz backfill pela conta primária da
-- instituição, dropa a unicidade antiga e cria a nova (com conta_id).
DO $$
DECLARE
    item record;
BEGIN
    FOR item IN SELECT * FROM (VALUES
        ('posicao_btg_snapshots',    '%btg%'),
        ('posicao_xp_snapshots',     '%xp%'),
        ('posicao_avenue_snapshots', '%avenue%'),
        ('posicao_agora_snapshots',  '%gora%')   -- casa agora e ágora
    ) AS t(tabela, padrao)
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES cliente_contas(id) ON DELETE CASCADE', item.tabela);

        EXECUTE format($f$
            UPDATE %I s SET conta_id = (
                SELECT cc.id FROM cliente_contas cc
                JOIN instituicoes i ON i.id = cc.instituicao_id
                WHERE cc.cliente_id = s.cliente_id AND i.nome ILIKE %L
                ORDER BY cc.ordem, cc.created_at LIMIT 1
            ) WHERE s.conta_id IS NULL
        $f$, item.tabela, item.padrao);

        PERFORM _drop_cliente_data_unique(item.tabela::regclass);

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = item.tabela::regclass AND conname = item.tabela || '_conta_data_uq'
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (cliente_id, conta_id, data_referencia)',
                item.tabela, item.tabela || '_conta_data_uq');
        END IF;

        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (conta_id)',
            'idx_' || item.tabela || '_conta', item.tabela);
    END LOOP;
END $$;
