-- ─────────────────────────────────────────────────────────────────────────────
-- CPF/CNPJ no cliente — chave universal de identificação por documento.
--
-- Até hoje o cliente era identificado só por codigo_avere/nome. Fontes que
-- entregam CPF (ex.: Avenue, que indexa a conta pelo CPF) não tinham como casar
-- com o cliente. Guardar o documento no próprio cliente resolve isso.
--
-- NÃO obrigatório (nullable) — preenchimento gradual; PF (CPF) ou PJ (CNPJ),
-- guardado só com dígitos. Índice único parcial evita dois clientes com o mesmo
-- documento, mas permite vários sem documento (NULL).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS documento text;

COMMENT ON COLUMN clientes.documento IS 'CPF (11 díg.) ou CNPJ (14 díg.), só dígitos. Nullable. Tipo PF/PJ inferido pelo tamanho.';

CREATE UNIQUE INDEX IF NOT EXISTS clientes_documento_unq
  ON clientes (documento)
  WHERE documento IS NOT NULL;
