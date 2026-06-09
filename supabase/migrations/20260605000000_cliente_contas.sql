-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 1 — cliente_contas: múltiplas contas por instituição por cliente
--
-- Hoje `clientes` tem UMA coluna por corretora (codigo_btg/xp/avenue/agora + cpf),
-- o que impede um cliente com 3 contas XP. Esta tabela modela 1 LINHA POR CONTA.
-- Cada conta = uma carteira própria (nunca consolidada entre si na Home).
--
-- Unifica também a cliente_instituicao_codigos (instituições manuais).
-- As colunas legadas em `clientes` são MANTIDAS nesta fase e sincronizadas por
-- trigger (a partir da conta primária de cada instituição) para que o sync das
-- edge functions continue funcionando até a Fase 2. Serão dropadas na Fase 4.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cliente_contas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id      UUID NOT NULL REFERENCES clientes(id)     ON DELETE CASCADE,
    instituicao_id  UUID NOT NULL REFERENCES instituicoes(id) ON DELETE RESTRICT,
    codigo          TEXT,          -- nº da conta (XP/BTG/Avenue) ou accountCode (Ágora)
    documento       TEXT,          -- CPF/CNPJ — relevante p/ Ágora (cpfCnpj)
    apelido         TEXT,          -- opcional; se vazio a UI exibe "Inst N"
    ordem           INT  NOT NULL DEFAULT 1,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_cliente     ON cliente_contas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_cc_instituicao ON cliente_contas (instituicao_id);

-- Reverso (account → cliente) precisa ser determinístico: nº de conta é único
-- por instituição. Índice parcial ignora contas sem código (algumas manuais).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cc_inst_codigo
    ON cliente_contas (instituicao_id, codigo)
    WHERE codigo IS NOT NULL AND codigo <> '';

ALTER TABLE cliente_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_cc"  ON cliente_contas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_cc" ON cliente_contas FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- ── Helper: resolve o id de uma instituição de API pelo nome ────────────────
CREATE OR REPLACE FUNCTION _inst_id(p_pattern TEXT)
RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT id FROM instituicoes WHERE nome ILIKE p_pattern ORDER BY (tipo = 'API') DESC, nome LIMIT 1;
$$;

-- ── Backfill das colunas legadas → linhas de conta ──────────────────────────
INSERT INTO cliente_contas (cliente_id, instituicao_id, codigo, documento, ordem)
SELECT c.id, _inst_id('%btg%'), c.codigo_btg, NULL, 1
FROM clientes c WHERE NULLIF(TRIM(c.codigo_btg), '') IS NOT NULL AND _inst_id('%btg%') IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO cliente_contas (cliente_id, instituicao_id, codigo, documento, ordem)
SELECT c.id, _inst_id('%xp%'), c.codigo_xp, NULL, 1
FROM clientes c WHERE NULLIF(TRIM(c.codigo_xp), '') IS NOT NULL AND _inst_id('%xp%') IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO cliente_contas (cliente_id, instituicao_id, codigo, documento, ordem)
SELECT c.id, _inst_id('%avenue%'), c.codigo_avenue, NULL, 1
FROM clientes c WHERE NULLIF(TRIM(c.codigo_avenue), '') IS NOT NULL AND _inst_id('%avenue%') IS NOT NULL
ON CONFLICT DO NOTHING;

-- Ágora: code = codigo_agora, documento = cpf
INSERT INTO cliente_contas (cliente_id, instituicao_id, codigo, documento, ordem)
SELECT c.id, COALESCE(_inst_id('%agora%'), _inst_id('%ágora%')), c.codigo_agora, c.cpf, 1
FROM clientes c
WHERE (NULLIF(TRIM(c.codigo_agora), '') IS NOT NULL OR NULLIF(TRIM(c.cpf), '') IS NOT NULL)
  AND COALESCE(_inst_id('%agora%'), _inst_id('%ágora%')) IS NOT NULL
ON CONFLICT DO NOTHING;

-- Instituições manuais (cliente_instituicao_codigos) → contas
INSERT INTO cliente_contas (cliente_id, instituicao_id, codigo, documento, ordem)
SELECT cic.cliente_id, cic.instituicao_id, cic.codigo, NULL, 1
FROM cliente_instituicao_codigos cic
WHERE NULLIF(TRIM(cic.codigo), '') IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Trigger: espelha a conta primária (menor ordem) de volta nas colunas
--    legadas de `clientes`, para o sync atual continuar funcionando. ──────────
CREATE OR REPLACE FUNCTION sync_codigos_legados(p_cliente UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE clientes SET
        codigo_btg    = (SELECT codigo FROM cliente_contas WHERE cliente_id = p_cliente AND instituicao_id = _inst_id('%btg%')    ORDER BY ordem, created_at LIMIT 1),
        codigo_xp     = (SELECT codigo FROM cliente_contas WHERE cliente_id = p_cliente AND instituicao_id = _inst_id('%xp%')     ORDER BY ordem, created_at LIMIT 1),
        codigo_avenue = (SELECT codigo FROM cliente_contas WHERE cliente_id = p_cliente AND instituicao_id = _inst_id('%avenue%') ORDER BY ordem, created_at LIMIT 1),
        codigo_agora  = (SELECT codigo    FROM cliente_contas WHERE cliente_id = p_cliente AND instituicao_id = COALESCE(_inst_id('%agora%'), _inst_id('%ágora%')) ORDER BY ordem, created_at LIMIT 1),
        cpf           = (SELECT documento FROM cliente_contas WHERE cliente_id = p_cliente AND instituicao_id = COALESCE(_inst_id('%agora%'), _inst_id('%ágora%')) ORDER BY ordem, created_at LIMIT 1)
    WHERE id = p_cliente;
END;
$$;

CREATE OR REPLACE FUNCTION trg_sync_codigos_legados()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM sync_codigos_legados(OLD.cliente_id);
        RETURN OLD;
    END IF;
    PERFORM sync_codigos_legados(NEW.cliente_id);
    IF TG_OP = 'UPDATE' AND NEW.cliente_id <> OLD.cliente_id THEN
        PERFORM sync_codigos_legados(OLD.cliente_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cliente_contas_sync_legado ON cliente_contas;
CREATE TRIGGER cliente_contas_sync_legado
    AFTER INSERT OR UPDATE OR DELETE ON cliente_contas
    FOR EACH ROW EXECUTE FUNCTION trg_sync_codigos_legados();

COMMENT ON TABLE cliente_contas IS 'Uma linha por conta do cliente numa instituição. Cada conta = carteira própria (Fase 1 do multi-conta).';
