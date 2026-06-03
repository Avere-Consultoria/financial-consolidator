-- ─────────────────────────────────────────────────────────────────────────────
-- Entrada semiautomática (PDF → JSON pelo agente de IA)
--
-- Modelo A (genérico): UMA tabela de snapshots + UMA de ativos para QUALQUER
-- instituição sem API. A coluna `instituicao` distingue (SANTANDER, Itaú, BB…).
-- Plugam no MESMO pipeline canônico das APIs (ativo_canonico_id).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posicao_manual_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id          UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    instituicao         TEXT NOT NULL,                 -- "SANTANDER", "Itaú"…
    data_referencia     DATE NOT NULL,
    data_sincronizacao  TIMESTAMPTZ DEFAULT NOW(),
    patrimonio_total    NUMERIC,
    saldo_cc            NUMERIC,
    saldo_rf            NUMERIC,
    saldo_fundos        NUMERIC,
    saldo_rv            NUMERIC,
    saldo_prev          NUMERIC,
    saldo_cripto        NUMERIC,
    saldo_outros        NUMERIC,
    is_month_end        BOOLEAN DEFAULT false,
    source              TEXT,                          -- "PDF_MANUAL_V2"
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (cliente_id, instituicao, data_referencia)
);

CREATE INDEX IF NOT EXISTS idx_manual_snap_cliente ON posicao_manual_snapshots (cliente_id);

CREATE TABLE IF NOT EXISTS posicao_manual_ativos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id         UUID NOT NULL REFERENCES posicao_manual_snapshots(id) ON DELETE CASCADE,
    ativo_canonico_id   UUID REFERENCES ativos_canonicos(id) ON DELETE SET NULL,
    asset_class         TEXT,
    tipo                TEXT,                          -- rótulo da classe (label)
    sub_tipo            TEXT,
    emissor             TEXT,                          -- emissor_nome (nome real)
    cnpj                TEXT,                          -- emissor_cnpj (raiz)
    ticker              TEXT,
    isin                TEXT,
    valor_bruto         NUMERIC,
    valor_liquido       NUMERIC,
    quantidade          NUMERIC,
    preco_mercado       NUMERIC,
    data_vencimento     DATE,
    data_aplicacao      DATE,
    benchmark           TEXT,
    rentabilidade       NUMERIC,
    yield_avg           NUMERIC,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_ativos_snapshot ON posicao_manual_ativos (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_manual_ativos_canonico ON posicao_manual_ativos (ativo_canonico_id);

-- RLS (mesmo modelo das tabelas FGC/BCB)
ALTER TABLE posicao_manual_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE posicao_manual_ativos    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_manual_snap"  ON posicao_manual_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_manual_snap" ON posicao_manual_snapshots FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_manual_ativos"  ON posicao_manual_ativos  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_manual_ativos" ON posicao_manual_ativos  FOR ALL    TO authenticated USING (true) WITH CHECK (true);
