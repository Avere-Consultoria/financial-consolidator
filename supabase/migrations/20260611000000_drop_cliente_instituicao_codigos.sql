-- ─────────────────────────────────────────────────────────────────────────────
-- Limpeza: remove cliente_instituicao_codigos (órfã).
-- Os códigos por cliente × instituição agora vivem em cliente_contas.
-- Nenhuma function ou frontend referencia mais esta tabela.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS cliente_instituicao_codigos;
