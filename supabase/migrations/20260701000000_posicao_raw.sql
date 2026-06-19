-- ─────────────────────────────────────────────────────────────────────────────
-- posicao_raw — arquivo do PAYLOAD COMPLETO da corretora por conta/sync.
--
-- Por quê: o reprocesso de canônicos (reprocessar-canonicos) re-roda o mapeamento
-- do connector a partir do raw guardado, SEM nova chamada à corretora (preserva a
-- janela da XP). O `dicionario_ativos.dados_brutos` guarda o item solto — insufic.
-- para alimentar os mappers, que iteram por GRUPO (rendaFixa/fundos/acoes…). Aqui
-- guardamos a resposta inteira, exatamente como veio, p/ replay fiel via /transform.
--
-- Uma linha por (conta, instituição, data_referencia) — upsert a cada sync da data
-- viva. Meses fechados são carimbados à parte e não são reprocessados.
-- Sem políticas RLS: acesso só pela service role (edges); o front nunca lê a tabela.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posicao_raw (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id      UUID REFERENCES clientes(id)       ON DELETE CASCADE,
    conta_id        UUID REFERENCES cliente_contas(id) ON DELETE CASCADE,
    instituicao     TEXT NOT NULL,                 -- 'XP' | 'BTG' | 'AGORA' | 'AVENUE'
    data_referencia DATE NOT NULL,
    payload         JSONB NOT NULL,                -- resposta crua, verbatim
    capturado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (conta_id, instituicao, data_referencia)
);

CREATE INDEX IF NOT EXISTS idx_posicao_raw_conta ON posicao_raw (conta_id, instituicao);
CREATE INDEX IF NOT EXISTS idx_posicao_raw_cliente ON posicao_raw (cliente_id);

ALTER TABLE posicao_raw ENABLE ROW LEVEL SECURITY;
-- (sem policies: bloqueado para anon/authenticated; service role contorna a RLS)
