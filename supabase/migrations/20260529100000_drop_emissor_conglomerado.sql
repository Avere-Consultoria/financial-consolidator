-- ─────────────────────────────────────────────────────────────────────────────
-- Limpeza: remove o vínculo emissor → conglomerado.
--
-- Decisão de arquitetura: Emissor (crédito privado) e Conglomerado (FGC bancário)
-- são mundos SEPARADOS. O ativo bancário resolve o conglomerado pelo emissor bruto
-- (nome/CNPJ da corretora) batido contra instituicoes_fgc — não passa mais pelo
-- dicionario_emissores. Portanto a coluna conglomerado_id ficou morta.
--
-- DROP COLUMN remove automaticamente a FK e o índice idx_emissor_congl.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE dicionario_emissores
    DROP COLUMN IF EXISTS conglomerado_id;
