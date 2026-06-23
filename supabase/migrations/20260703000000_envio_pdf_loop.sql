-- ─────────────────────────────────────────────────────────────────────────────
-- Fecha o loop de auditoria do PDF manual: o import-manual-position passa a marcar
-- o envio como 'processado' (e linka ao snapshot gerado). Assim dá pra ver quais
-- PDFs enviados já viraram posição e quais ficaram no limbo.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE envio_pdf_manual
  ADD COLUMN IF NOT EXISTS processado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snapshot_id   UUID REFERENCES posicao_manual_snapshots(id) ON DELETE SET NULL;

-- status agora pode ser: 'enviado' | 'erro' | 'processado'
COMMENT ON COLUMN envio_pdf_manual.status        IS 'enviado | erro | processado';
COMMENT ON COLUMN envio_pdf_manual.processado_em IS 'quando o import-manual-position consumiu este envio';
COMMENT ON COLUMN envio_pdf_manual.snapshot_id   IS 'snapshot manual gerado a partir deste envio';
