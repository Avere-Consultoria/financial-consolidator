-- ═══════════════════════════════════════════════════════════════════════════
-- promover_ativo_manual — ação GATED do master (#46b).
--
-- Cria (ou reusa) um ativos_canonicos a partir de um ativo MANUAL com identidade
-- (ISIN/ticker/CNPJ) + a classificação confirmada pelo master, registra a linha
-- de identidade em dicionario_ativos (futuros linkam sozinhos), grava a curadoria
-- durável em biblioteca_ativos (mesmo padrão do DrawerCanonico) e vincula o
-- posicao_manual_ativos.
--
-- Exceção AUTORIZADA à política naoEscreverGlobal → SECURITY DEFINER + is_master().
-- Classe e identificador OBRIGATÓRIOS; emissor opcional.
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS promover_ativo_manual(uuid, text, uuid, text, text, date, text);

CREATE OR REPLACE FUNCTION promover_ativo_manual(
    p_manual_ativo_id uuid,
    p_classe          text,
    p_emissor_id      uuid    DEFAULT NULL,
    p_sub_tipo        text    DEFAULT NULL,
    p_benchmark       text    DEFAULT NULL,
    p_taxa            text    DEFAULT NULL,
    p_vencimento      date    DEFAULT NULL,
    p_liquidez        text    DEFAULT NULL,
    p_percentual      numeric DEFAULT NULL,
    p_spread          numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ativo       posicao_manual_ativos%ROWTYPE;
    v_instituicao text;
    v_codigo      text;
    v_tipo        text;
    v_canonico    uuid;
    v_novo        boolean := false;
    v_nome        text;
    v_subtipo     text;
BEGIN
    IF NOT public.is_master() THEN
        RAISE EXCEPTION 'Apenas o master pode promover ativos manuais';
    END IF;
    IF COALESCE(btrim(p_classe), '') = '' THEN
        RAISE EXCEPTION 'Classe é obrigatória';
    END IF;

    SELECT * INTO v_ativo FROM posicao_manual_ativos WHERE id = p_manual_ativo_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ativo manual não encontrado'; END IF;

    -- Identidade OBRIGATÓRIA: ISIN > TICKER > CNPJ
    IF COALESCE(btrim(v_ativo.isin), '') <> '' THEN
        v_codigo := upper(btrim(v_ativo.isin)); v_tipo := 'ISIN';
    ELSIF COALESCE(btrim(v_ativo.ticker), '') <> '' THEN
        v_codigo := upper(btrim(v_ativo.ticker)); v_tipo := 'TICKER';
    ELSIF COALESCE(btrim(v_ativo.cnpj), '') <> '' THEN
        v_codigo := regexp_replace(v_ativo.cnpj, '\D', '', 'g'); v_tipo := 'CNPJ';
    ELSE
        RAISE EXCEPTION 'Ativo sem identificador (ISIN/ticker/CNPJ) — promova só com identidade';
    END IF;

    SELECT instituicao INTO v_instituicao FROM posicao_manual_snapshots WHERE id = v_ativo.snapshot_id;
    v_nome    := COALESCE(NULLIF(btrim(v_ativo.emissor), ''), v_ativo.ticker, 'Ativo manual');
    v_subtipo := COALESCE(NULLIF(btrim(p_sub_tipo), ''), v_ativo.sub_tipo);

    -- Já existe canônico com essa identidade? → dedup (só vincula)
    SELECT ativo_canonico_id INTO v_canonico
    FROM dicionario_ativos
    WHERE codigo_identificador = v_codigo AND ativo_canonico_id IS NOT NULL
    LIMIT 1;

    IF v_canonico IS NULL THEN
        v_novo := true;
        INSERT INTO ativos_canonicos
            (nome_canonico, classe_avere, sub_tipo_canonico, emissor_id, data_vencimento,
             taxa_canonica, taxa_formatada, benchmark_canonico, liquidez_avere, origem_classificacao)
        VALUES
            (v_nome, p_classe, v_subtipo, p_emissor_id, COALESCE(p_vencimento, v_ativo.data_vencimento),
             p_taxa, p_taxa, p_benchmark, p_liquidez, 'manual')
        RETURNING id INTO v_canonico;
    END IF;

    -- Linha de identidade p/ futuros linkarem (idempotente)
    INSERT INTO dicionario_ativos
        (instituicao_origem, codigo_identificador, tipo_identificador, nome_ativo, classe_original, ativo_canonico_id, dados_brutos)
    VALUES
        (COALESCE(v_instituicao, 'MANUAL'), v_codigo, v_tipo, v_nome, v_ativo.tipo, v_canonico, to_jsonb(v_ativo))
    ON CONFLICT (instituicao_origem, codigo_identificador, tipo_identificador)
        DO UPDATE SET ativo_canonico_id = EXCLUDED.ativo_canonico_id;

    -- Curadoria durável → biblioteca_ativos (mesmo padrão do DrawerCanonico).
    -- chave = identificador já normalizado (CNPJ dígitos; ISIN/ticker upper).
    INSERT INTO biblioteca_ativos
        (chave, tipo_chave, sub_tipo, nome_ref, classe_avere, benchmark, taxa_formatada, detalhes, fonte, atualizado_em)
    VALUES
        (v_codigo, v_tipo, v_subtipo, v_nome, p_classe, p_benchmark, p_taxa,
         jsonb_strip_nulls(jsonb_build_object('percentual_indexador', p_percentual, 'spread', p_spread)),
         'manual', now())
    ON CONFLICT (chave) DO UPDATE SET
        sub_tipo = EXCLUDED.sub_tipo, classe_avere = EXCLUDED.classe_avere,
        benchmark = EXCLUDED.benchmark, taxa_formatada = EXCLUDED.taxa_formatada,
        detalhes = EXCLUDED.detalhes, fonte = 'manual', atualizado_em = now();

    -- Vincula o ativo manual
    UPDATE posicao_manual_ativos SET ativo_canonico_id = v_canonico WHERE id = p_manual_ativo_id;

    RETURN jsonb_build_object(
        'sucesso', true, 'canonico_id', v_canonico, 'novo', v_novo,
        'identificador', v_tipo || ':' || v_codigo
    );
END $$;

GRANT EXECUTE ON FUNCTION promover_ativo_manual(uuid, text, uuid, text, text, text, date, text, numeric, numeric) TO authenticated;
