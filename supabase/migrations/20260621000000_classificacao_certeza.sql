-- ═══════════════════════════════════════════════════════════════════════════
-- Classificação por certeza
--
-- Princípio (decisão de gestão): o sistema só classifica automaticamente
-- aquilo que tem lastro em dado imutável (identificador ou indexador).
-- Nome de ativo NUNCA decide classe. Sem certeza → classe fica vazia
-- ("A classificar") e entra na fila de revisão do Master.
--
--   • mapa_classificacao — mapa curado (Base_2): identificador → classe Avere.
--     Consultado pelos Edge Functions ao criar canônicos novos.
--   • ativos_canonicos.origem_classificacao — de onde veio a classe:
--       'manual' = Master via UI   (intocável por reprocessamentos)
--       'mapa'   = mapa curado     (CNPJ/ticker/ISIN/código)
--       'auto'   = regra de certeza (indexador, CASH, EQUITIES…)
--       NULL     = sem classificação / legado pré-coluna
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mapa_classificacao (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chave         text NOT NULL,            -- CNPJ (14 dígitos), ticker, ISIN ou código CETIP/COE
    tipo_chave    text NOT NULL CHECK (tipo_chave IN ('CNPJ','ISIN','TICKER','CODIGO')),
    classe_avere  text NOT NULL,
    fonte         text NOT NULL DEFAULT 'BASE_2',
    notas         text,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (chave)
);

CREATE INDEX IF NOT EXISTS idx_mapa_classificacao_chave ON mapa_classificacao (chave);

-- Leitura para usuários logados; escrita apenas via service_role (edge/SQL editor)
ALTER TABLE mapa_classificacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_read_mapa_classificacao" ON mapa_classificacao;
CREATE POLICY "auth_read_mapa_classificacao" ON mapa_classificacao
    FOR SELECT TO authenticated USING (true);

ALTER TABLE ativos_canonicos
    ADD COLUMN IF NOT EXISTS origem_classificacao text
        CHECK (origem_classificacao IN ('manual','mapa','auto'));

COMMENT ON COLUMN ativos_canonicos.origem_classificacao IS
    'manual=Master via UI | mapa=mapa curado por identificador | auto=regra de certeza | NULL=a classificar/legado';
