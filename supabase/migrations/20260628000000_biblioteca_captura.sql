-- ═══════════════════════════════════════════════════════════════════════════
-- Biblioteca rica — captura (Fase 1.1)
--
-- Dois deltas pequenos (nullable, reversíveis) que sustentam os specs congelados:
--   • biblioteca_ativos.isin   — identificador padrão (BTG entrega em RF e RV/FII)
--   • dicionario_ativos.dados_brutos jsonb — o CRU genérico de cada fonte, por
--     instituição. É o "lado a lado" que o editor mostra (cru × curado) e a rede
--     de segurança: captura tudo desde já, mesmo subtipo ainda não mapeado.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE biblioteca_ativos ADD COLUMN IF NOT EXISTS isin text;
CREATE INDEX IF NOT EXISTS idx_biblioteca_ativos_isin
    ON biblioteca_ativos (isin) WHERE isin IS NOT NULL;

ALTER TABLE dicionario_ativos ADD COLUMN IF NOT EXISTS dados_brutos jsonb;

COMMENT ON COLUMN biblioteca_ativos.isin IS 'ISIN (ref. cruzada); a chave de RF é o código CETIP/SELIC';
COMMENT ON COLUMN dicionario_ativos.dados_brutos IS 'Payload cru (genérico) da API daquela instituição p/ o ativo — base da curadoria';
