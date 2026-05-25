-- ═══════════════════════════════════════════════════════════════════════════
-- posicao_agora_aquisicoes — histórico de aplicações por ativo Ágora
--
-- Recebe dados dos endpoints:
--   /detailedposition/treasuryDirect/{cpf}/{account}/{bondType}/{maturityDate}
--   /detailedposition/funds/{cpf}/{account}/{sourceCode}
--
-- Modelo: 1 ativo (em posicao_agora_ativos) → N aquisições.
-- Genérico para acomodar futuros endpoints detailed (campo tipo_aquisicao).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS posicao_agora_aquisicoes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ativo_id            uuid NOT NULL REFERENCES posicao_agora_ativos(id) ON DELETE CASCADE,
    tipo_aquisicao      text NOT NULL,    -- 'TESOURO_DIRETO' | 'FUNDO'

    -- Comuns
    application_date    date,             -- TD: applicationDate | Fundo: certificateDate
    reference_date      date,             -- só Fundo (referenceDate)
    quantity            numeric,          -- TD: bondQuantity | Fundo: quotesQuantity
    gross_value         numeric,          -- valor bruto/posição
    net_value           numeric,
    ir_value            numeric,
    iof_value           numeric,

    -- Específicos TD
    operation_status    text,             -- "Efetivado"
    purchase_price      numeric,          -- preço unitário compra
    market_price        numeric,          -- preço unitário atual
    profit_value        numeric,          -- lucro acumulado
    tax_rate            numeric,          -- taxa contratada (% a.a.)
    days                int,              -- dias desde aplicação
    market_type         text,             -- "SELIC"
    issuer_name         text,             -- "Tesouro Nacional"
    bond_name           text,
    index_name          text,             -- "IPCA"

    -- Auditoria
    created_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_tipo_aquisicao CHECK (tipo_aquisicao IN ('TESOURO_DIRETO', 'FUNDO'))
);

CREATE INDEX IF NOT EXISTS idx_agora_aquisicoes_ativo_id ON posicao_agora_aquisicoes(ativo_id);
CREATE INDEX IF NOT EXISTS idx_agora_aquisicoes_tipo    ON posicao_agora_aquisicoes(tipo_aquisicao);

-- RLS (mesmo padrão das outras novas tabelas)
ALTER TABLE posicao_agora_aquisicoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated_all" ON posicao_agora_aquisicoes;
CREATE POLICY "allow_authenticated_all" ON posicao_agora_aquisicoes
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
