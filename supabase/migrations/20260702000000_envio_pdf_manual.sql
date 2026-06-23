-- ─────────────────────────────────────────────────────────────────────────────
-- envio_pdf_manual — log de auditoria dos PDFs manuais enviados ao Zapier.
--
-- Fluxo: consultor sobe um PDF de posição de uma instituição MANUAL (não-API) do
-- cliente; a edge enviar-pdf-zapier valida e repassa ao webhook do Zapier (que
-- dispara a IA/operador). Cada envio é registrado aqui p/ auditoria (quem, qual
-- cliente/instituição, qual mês de fechamento, quando, status).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS envio_pdf_manual (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id      UUID REFERENCES clientes(id)       ON DELETE SET NULL,
    conta_id        UUID REFERENCES cliente_contas(id) ON DELETE SET NULL,
    instituicao     TEXT NOT NULL,                 -- nome da instituição (manual)
    data_referencia DATE NOT NULL,                 -- fechamento/mês que o PDF representa
    consultor_id    UUID,                          -- consultor responsável (clientes.consultor_id)
    enviado_por     UUID,                          -- auth.uid() de quem clicou
    arquivo_nome    TEXT,
    arquivo_bytes   INTEGER,
    status          TEXT NOT NULL DEFAULT 'enviado', -- 'enviado' | 'erro'
    detalhe         TEXT,                          -- erro / resposta do Zapier
    enviado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_envio_pdf_cliente ON envio_pdf_manual (cliente_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_envio_pdf_quando  ON envio_pdf_manual (enviado_em DESC);

ALTER TABLE envio_pdf_manual ENABLE ROW LEVEL SECURITY;
-- Leitura p/ futura tela de auditoria; escrita só pela service role (edge).
CREATE POLICY "auth_read_envio_pdf" ON envio_pdf_manual FOR SELECT TO authenticated USING (true);
