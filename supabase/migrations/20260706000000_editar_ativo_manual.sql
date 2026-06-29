-- ═══════════════════════════════════════════════════════════════════════════
-- #46c — Editar o "cru" de um ativo manual + trava contra sobrescrita.
--
-- A IA às vezes extrai errado (emissor, sub_tipo, identificador). O master corrige
-- direto na linha de posicao_manual_ativos. Duas garantias acompanham a edição:
--
--   1) editado_em / editado_por carimbam a linha → o import-manual-position passa a
--      FIXAR linhas editadas (não as apaga no re-import; ver a function TS).
--   2) Ao corrigir um identificador, o RPC RELIGA na hora a um canônico existente
--      (lê o global, nunca escreve — Camada 2). Sem match → fica local.
--
-- conflito_reimport sinaliza que um re-import trouxe classificação diferente da que
-- o master fixou (a edição vence, mas o selo avisa). Editar de novo limpa o selo.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE posicao_manual_ativos
    ADD COLUMN IF NOT EXISTS editado_em        timestamptz,
    ADD COLUMN IF NOT EXISTS editado_por       uuid,
    ADD COLUMN IF NOT EXISTS conflito_reimport boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS conflito_dados    jsonb;

CREATE OR REPLACE FUNCTION editar_ativo_manual(
    p_id              uuid,
    p_emissor         text DEFAULT NULL,
    p_sub_tipo        text DEFAULT NULL,
    p_benchmark       text DEFAULT NULL,
    p_data_vencimento date DEFAULT NULL,
    p_cnpj            text DEFAULT NULL,
    p_ticker          text DEFAULT NULL,
    p_isin            text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ativo    posicao_manual_ativos%ROWTYPE;
    v_cnpj     text;
    v_ticker   text;
    v_isin     text;
    v_codigo   text;
    v_canonico uuid;
    v_fundo    boolean;
BEGIN
    IF NOT public.is_master() THEN
        RAISE EXCEPTION 'Apenas o master pode editar ativos manuais';
    END IF;

    SELECT * INTO v_ativo FROM posicao_manual_ativos WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ativo manual não encontrado — o documento pode ter sido reprocessado. Recarregue a tela.';
    END IF;

    -- Normaliza identificadores (CNPJ só dígitos; ISIN/ticker upper)
    v_cnpj   := NULLIF(regexp_replace(COALESCE(p_cnpj, ''), '\D', '', 'g'), '');
    v_ticker := NULLIF(upper(btrim(COALESCE(p_ticker, ''))), '');
    v_isin   := NULLIF(upper(btrim(COALESCE(p_isin, ''))), '');

    -- CNPJ só é identidade do ATIVO quando é fundo (senão é do emissor, ambíguo).
    v_fundo := upper(COALESCE(v_ativo.asset_class, '')) LIKE '%FUND%'
            OR upper(COALESCE(p_sub_tipo, v_ativo.sub_tipo, '')) = 'FUNDO';

    -- Identidade p/ religar: ISIN > TICKER > CNPJ(se fundo)
    IF    v_isin   IS NOT NULL THEN v_codigo := v_isin;
    ELSIF v_ticker IS NOT NULL THEN v_codigo := v_ticker;
    ELSIF v_cnpj   IS NOT NULL AND v_fundo THEN v_codigo := v_cnpj;
    END IF;

    -- Religa (lê o global, nunca cria). Sem identidade ou sem match → fica local.
    v_canonico := NULL;
    IF v_codigo IS NOT NULL THEN
        SELECT ativo_canonico_id INTO v_canonico
        FROM dicionario_ativos
        WHERE codigo_identificador = v_codigo AND ativo_canonico_id IS NOT NULL
        LIMIT 1;
    END IF;

    UPDATE posicao_manual_ativos SET
        emissor           = NULLIF(btrim(COALESCE(p_emissor, '')), ''),
        sub_tipo          = NULLIF(btrim(COALESCE(p_sub_tipo, '')), ''),
        benchmark         = NULLIF(btrim(COALESCE(p_benchmark, '')), ''),
        data_vencimento   = p_data_vencimento,
        cnpj              = v_cnpj,
        ticker            = v_ticker,
        isin              = v_isin,
        ativo_canonico_id = v_canonico,
        editado_em        = now(),
        editado_por       = auth.uid(),
        conflito_reimport = false,
        conflito_dados    = NULL
    WHERE id = p_id;

    RETURN jsonb_build_object(
        'sucesso',   true,
        'vinculado', v_canonico IS NOT NULL,
        'canonico_id', v_canonico
    );
END $$;

GRANT EXECUTE ON FUNCTION editar_ativo_manual(uuid, text, text, text, date, text, text, text) TO authenticated;
