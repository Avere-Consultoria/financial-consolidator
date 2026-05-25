-- ═══════════════════════════════════════════════════════════════════════════
-- Função: fechar_mes(cliente, mes, consultor)
--
-- Para cada instituição (BTG/XP/Avenue/Ágora):
--   1. Encontra o snapshot vivo com maior data_referencia DENTRO do mês.
--   2. Cria uma linha em snapshots_fechados.
--   3. Materializa cada ativo em posicoes_fechadas com a classificação
--      curada (canônico + exceções cliente/global) carimbada.
--   4. Marca o snapshot fonte com is_month_end = true.
--
-- Comportamento:
--   - Idempotente: se já existe fechamento desse (cliente, mês), apaga e refaz.
--   - Parcial: instituições sem snapshot no mês são puladas (sem erro).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fechar_mes(
    p_cliente_id     uuid,
    p_mes_referencia text,        -- "YYYY-MM"
    p_consultor_id   uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mes_inicio       date;
    v_mes_fim          date;
    v_fechamentos      jsonb := '[]'::jsonb;

    -- por instituição
    v_snapshot_id      uuid;
    v_data_ref         date;
    v_patrimonio       numeric;
    v_fechado_id       uuid;
    v_ativos_count     int;
BEGIN
    -- ── Validações ────────────────────────────────────────────────────────
    IF p_cliente_id IS NULL OR p_mes_referencia IS NULL OR p_consultor_id IS NULL THEN
        RAISE EXCEPTION 'cliente_id, mes_referencia e consultor_id são obrigatórios';
    END IF;

    IF p_mes_referencia !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'mes_referencia deve estar no formato YYYY-MM';
    END IF;

    v_mes_inicio := (p_mes_referencia || '-01')::date;
    v_mes_fim    := (v_mes_inicio + interval '1 month' - interval '1 day')::date;

    -- ── Idempotência: remove fechamento anterior ─────────────────────────
    DELETE FROM snapshots_fechados
    WHERE cliente_id = p_cliente_id
      AND mes_referencia = p_mes_referencia;
    -- (posicoes_fechadas é apagado em cascade via ON DELETE CASCADE)


    -- ═══════════════════════════════════════════════════════════════════
    -- BTG
    -- ═══════════════════════════════════════════════════════════════════
    v_snapshot_id := NULL; v_data_ref := NULL; v_patrimonio := NULL; v_ativos_count := 0;

    SELECT id, data_referencia, patrimonio_total
    INTO v_snapshot_id, v_data_ref, v_patrimonio
    FROM posicao_btg_snapshots
    WHERE cliente_id = p_cliente_id
      AND data_referencia BETWEEN v_mes_inicio AND v_mes_fim
    ORDER BY data_referencia DESC
    LIMIT 1;

    IF v_snapshot_id IS NOT NULL THEN
        INSERT INTO snapshots_fechados (cliente_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by)
        VALUES (p_cliente_id, 'BTG', p_mes_referencia, v_data_ref, v_snapshot_id, v_patrimonio, p_consultor_id)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (
            snapshot_fechado_id, ativo_canonico_id,
            nome_exibicao, classe_avere, liquidez_avere,
            emissor_id, emissor_nome, data_vencimento,
            taxa, benchmark,
            valor_bruto, valor_liquido, quantidade, preco_mercado,
            instituicao, codigo_identificador_origem, tipo_identificador_origem
        )
        SELECT
            v_fechado_id,
            p.ativo_canonico_id,
            -- nome_exibicao: apelido > nome_canonico > emissor
            COALESCE(NULLIF(e_cli.apelido_ativo, ''), NULLIF(e_glo.apelido_ativo, ''), c.nome_canonico, p.emissor),
            -- classe: exceção cliente > global > canônico
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.maturity_date),
            COALESCE(c.taxa_canonica, p.rentabilidade),
            COALESCE(c.benchmark_canonico, p.benchmark),
            p.valor_bruto, p.valor_liquido, p.quantidade, p.preco_mercado,
            'BTG',
            COALESCE(d.codigo_identificador, p.isin, p.cetip_code, p.ticker, p.security_code),
            COALESCE(d.tipo_identificador, CASE WHEN p.isin IS NOT NULL THEN 'ISIN' WHEN p.cetip_code IS NOT NULL THEN 'ISIN' ELSE 'TICKER' END)
        FROM posicao_btg_ativos p
        LEFT JOIN ativos_canonicos c           ON c.id = p.ativo_canonico_id
        LEFT JOIN excecoes_classificacao e_cli ON e_cli.ativo_canonico_id = p.ativo_canonico_id AND e_cli.consultor_id = p_consultor_id AND e_cli.cliente_id = p_cliente_id
        LEFT JOIN excecoes_classificacao e_glo ON e_glo.ativo_canonico_id = p.ativo_canonico_id AND e_glo.consultor_id = p_consultor_id AND e_glo.cliente_id IS NULL
        LEFT JOIN dicionario_ativos d          ON d.ativo_canonico_id = p.ativo_canonico_id AND d.instituicao_origem = 'BTG'
        LEFT JOIN dicionario_emissores em      ON em.id = COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id)
        WHERE p.snapshot_id = v_snapshot_id;

        GET DIAGNOSTICS v_ativos_count = ROW_COUNT;

        UPDATE posicao_btg_snapshots SET is_month_end = true WHERE id = v_snapshot_id;
    END IF;

    v_fechamentos := v_fechamentos || jsonb_build_array(
        jsonb_build_object(
            'instituicao', 'BTG',
            'data_referencia', v_data_ref,
            'patrimonio_total', v_patrimonio,
            'ativos_materializados', v_ativos_count
        )
    );


    -- ═══════════════════════════════════════════════════════════════════
    -- XP
    -- ═══════════════════════════════════════════════════════════════════
    v_snapshot_id := NULL; v_data_ref := NULL; v_patrimonio := NULL; v_ativos_count := 0;

    SELECT id, data_referencia, patrimonio_total
    INTO v_snapshot_id, v_data_ref, v_patrimonio
    FROM posicao_xp_snapshots
    WHERE cliente_id = p_cliente_id
      AND data_referencia BETWEEN v_mes_inicio AND v_mes_fim
    ORDER BY data_referencia DESC
    LIMIT 1;

    IF v_snapshot_id IS NOT NULL THEN
        INSERT INTO snapshots_fechados (cliente_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by)
        VALUES (p_cliente_id, 'XP', p_mes_referencia, v_data_ref, v_snapshot_id, v_patrimonio, p_consultor_id)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (
            snapshot_fechado_id, ativo_canonico_id,
            nome_exibicao, classe_avere, liquidez_avere,
            emissor_id, emissor_nome, data_vencimento,
            taxa, benchmark,
            valor_bruto, valor_liquido, quantidade, preco_mercado,
            instituicao, codigo_identificador_origem, tipo_identificador_origem
        )
        SELECT
            v_fechado_id,
            p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo, ''), NULLIF(e_glo.apelido_ativo, ''), c.nome_canonico, p.nome, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            c.taxa_canonica,
            COALESCE(c.benchmark_canonico, p.benchmark),
            p.valor_bruto, p.valor_liquido, p.quantidade, p.preco_unitario,
            'XP',
            COALESCE(d.codigo_identificador, p.isin, p.cnpj, p.codigo_ativo, p.ticker),
            COALESCE(d.tipo_identificador, CASE WHEN p.isin IS NOT NULL THEN 'ISIN' WHEN p.cnpj IS NOT NULL THEN 'CNPJ' ELSE 'TICKER' END)
        FROM posicao_xp_ativos p
        LEFT JOIN ativos_canonicos c           ON c.id = p.ativo_canonico_id
        LEFT JOIN excecoes_classificacao e_cli ON e_cli.ativo_canonico_id = p.ativo_canonico_id AND e_cli.consultor_id = p_consultor_id AND e_cli.cliente_id = p_cliente_id
        LEFT JOIN excecoes_classificacao e_glo ON e_glo.ativo_canonico_id = p.ativo_canonico_id AND e_glo.consultor_id = p_consultor_id AND e_glo.cliente_id IS NULL
        LEFT JOIN dicionario_ativos d          ON d.ativo_canonico_id = p.ativo_canonico_id AND d.instituicao_origem = 'XP'
        LEFT JOIN dicionario_emissores em      ON em.id = COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id)
        WHERE p.snapshot_id = v_snapshot_id;

        GET DIAGNOSTICS v_ativos_count = ROW_COUNT;

        UPDATE posicao_xp_snapshots SET is_month_end = true WHERE id = v_snapshot_id;
    END IF;

    v_fechamentos := v_fechamentos || jsonb_build_array(
        jsonb_build_object(
            'instituicao', 'XP',
            'data_referencia', v_data_ref,
            'patrimonio_total', v_patrimonio,
            'ativos_materializados', v_ativos_count
        )
    );


    -- ═══════════════════════════════════════════════════════════════════
    -- Avenue (sem valor_liquido separado, sem preco_mercado, sem taxa/benchmark)
    -- ═══════════════════════════════════════════════════════════════════
    v_snapshot_id := NULL; v_data_ref := NULL; v_patrimonio := NULL; v_ativos_count := 0;

    SELECT id, data_referencia, patrimonio_total
    INTO v_snapshot_id, v_data_ref, v_patrimonio
    FROM posicao_avenue_snapshots
    WHERE cliente_id = p_cliente_id
      AND data_referencia BETWEEN v_mes_inicio AND v_mes_fim
    ORDER BY data_referencia DESC
    LIMIT 1;

    IF v_snapshot_id IS NOT NULL THEN
        INSERT INTO snapshots_fechados (cliente_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by)
        VALUES (p_cliente_id, 'AVENUE', p_mes_referencia, v_data_ref, v_snapshot_id, v_patrimonio, p_consultor_id)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (
            snapshot_fechado_id, ativo_canonico_id,
            nome_exibicao, classe_avere, liquidez_avere,
            emissor_id, emissor_nome, data_vencimento,
            taxa, benchmark,
            valor_bruto, valor_liquido, quantidade, preco_mercado,
            instituicao, codigo_identificador_origem, tipo_identificador_origem
        )
        SELECT
            v_fechado_id,
            p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo, ''), NULLIF(e_glo.apelido_ativo, ''), c.nome_canonico, p.nome),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.maturity_date),
            c.taxa_canonica,
            c.benchmark_canonico,
            p.valor_bruto_brl, p.valor_bruto_brl, p.quantidade, NULL,
            'AVENUE',
            COALESCE(d.codigo_identificador, p.isin, p.cusip, p.ticker),
            COALESCE(d.tipo_identificador, CASE WHEN p.isin IS NOT NULL THEN 'ISIN' WHEN p.cusip IS NOT NULL THEN 'CUSIP' ELSE 'TICKER' END)
        FROM posicao_avenue_ativos p
        LEFT JOIN ativos_canonicos c           ON c.id = p.ativo_canonico_id
        LEFT JOIN excecoes_classificacao e_cli ON e_cli.ativo_canonico_id = p.ativo_canonico_id AND e_cli.consultor_id = p_consultor_id AND e_cli.cliente_id = p_cliente_id
        LEFT JOIN excecoes_classificacao e_glo ON e_glo.ativo_canonico_id = p.ativo_canonico_id AND e_glo.consultor_id = p_consultor_id AND e_glo.cliente_id IS NULL
        LEFT JOIN dicionario_ativos d          ON d.ativo_canonico_id = p.ativo_canonico_id AND d.instituicao_origem = 'AVENUE'
        LEFT JOIN dicionario_emissores em      ON em.id = COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id)
        WHERE p.snapshot_id = v_snapshot_id;

        GET DIAGNOSTICS v_ativos_count = ROW_COUNT;

        UPDATE posicao_avenue_snapshots SET is_month_end = true WHERE id = v_snapshot_id;
    END IF;

    v_fechamentos := v_fechamentos || jsonb_build_array(
        jsonb_build_object(
            'instituicao', 'AVENUE',
            'data_referencia', v_data_ref,
            'patrimonio_total', v_patrimonio,
            'ativos_materializados', v_ativos_count
        )
    );


    -- ═══════════════════════════════════════════════════════════════════
    -- Ágora
    -- ═══════════════════════════════════════════════════════════════════
    v_snapshot_id := NULL; v_data_ref := NULL; v_patrimonio := NULL; v_ativos_count := 0;

    SELECT id, data_referencia, patrimonio_total
    INTO v_snapshot_id, v_data_ref, v_patrimonio
    FROM posicao_agora_snapshots
    WHERE cliente_id = p_cliente_id
      AND data_referencia BETWEEN v_mes_inicio AND v_mes_fim
    ORDER BY data_referencia DESC
    LIMIT 1;

    IF v_snapshot_id IS NOT NULL THEN
        INSERT INTO snapshots_fechados (cliente_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by)
        VALUES (p_cliente_id, 'AGORA', p_mes_referencia, v_data_ref, v_snapshot_id, v_patrimonio, p_consultor_id)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (
            snapshot_fechado_id, ativo_canonico_id,
            nome_exibicao, classe_avere, liquidez_avere,
            emissor_id, emissor_nome, data_vencimento,
            taxa, benchmark,
            valor_bruto, valor_liquido, quantidade, preco_mercado,
            instituicao, codigo_identificador_origem, tipo_identificador_origem
        )
        SELECT
            v_fechado_id,
            p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo, ''), NULLIF(e_glo.apelido_ativo, ''), c.nome_canonico, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            COALESCE(c.taxa_canonica, p.taxa),
            c.benchmark_canonico,
            p.valor_bruto, p.valor_liquido, p.quantidade, p.preco_unitario,
            'AGORA',
            COALESCE(d.codigo_identificador, p.security_code, p.ticker),
            COALESCE(d.tipo_identificador, CASE WHEN p.security_code IS NOT NULL THEN 'ISIN' ELSE 'TICKER' END)
        FROM posicao_agora_ativos p
        LEFT JOIN ativos_canonicos c           ON c.id = p.ativo_canonico_id
        LEFT JOIN excecoes_classificacao e_cli ON e_cli.ativo_canonico_id = p.ativo_canonico_id AND e_cli.consultor_id = p_consultor_id AND e_cli.cliente_id = p_cliente_id
        LEFT JOIN excecoes_classificacao e_glo ON e_glo.ativo_canonico_id = p.ativo_canonico_id AND e_glo.consultor_id = p_consultor_id AND e_glo.cliente_id IS NULL
        LEFT JOIN dicionario_ativos d          ON d.ativo_canonico_id = p.ativo_canonico_id AND d.instituicao_origem = 'AGORA'
        LEFT JOIN dicionario_emissores em      ON em.id = COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id)
        WHERE p.snapshot_id = v_snapshot_id;

        GET DIAGNOSTICS v_ativos_count = ROW_COUNT;

        UPDATE posicao_agora_snapshots SET is_month_end = true WHERE id = v_snapshot_id;
    END IF;

    v_fechamentos := v_fechamentos || jsonb_build_array(
        jsonb_build_object(
            'instituicao', 'AGORA',
            'data_referencia', v_data_ref,
            'patrimonio_total', v_patrimonio,
            'ativos_materializados', v_ativos_count
        )
    );


    -- ── Resposta ─────────────────────────────────────────────────────────
    RETURN jsonb_build_object(
        'sucesso', true,
        'cliente_id', p_cliente_id,
        'mes_referencia', p_mes_referencia,
        'fechamentos', v_fechamentos
    );
END;
$$;

GRANT EXECUTE ON FUNCTION fechar_mes(uuid, text, uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- Função auxiliar: listar_meses_fechamento(cliente)
--
-- Retorna lista de meses por cliente com status (aberto/fechado) + preview
-- dos snapshots disponíveis por instituição (data_referencia mais recente
-- dentro do mês).
--
-- Útil para popular a tela de Fechamento.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION listar_meses_fechamento(p_cliente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Agrega por mes_referencia (YYYY-MM) o que cada instituição tem disponível
    WITH meses_disponiveis AS (
        SELECT to_char(data_referencia, 'YYYY-MM') AS mes, 'BTG'    AS inst, data_referencia, patrimonio_total
        FROM posicao_btg_snapshots WHERE cliente_id = p_cliente_id
        UNION ALL
        SELECT to_char(data_referencia, 'YYYY-MM'), 'XP',     data_referencia, patrimonio_total
        FROM posicao_xp_snapshots WHERE cliente_id = p_cliente_id
        UNION ALL
        SELECT to_char(data_referencia, 'YYYY-MM'), 'AVENUE', data_referencia, patrimonio_total
        FROM posicao_avenue_snapshots WHERE cliente_id = p_cliente_id
        UNION ALL
        SELECT to_char(data_referencia, 'YYYY-MM'), 'AGORA',  data_referencia, patrimonio_total
        FROM posicao_agora_snapshots WHERE cliente_id = p_cliente_id
    ),
    melhor_por_mes_inst AS (
        SELECT mes, inst,
               MAX(data_referencia) AS data_referencia_max
        FROM meses_disponiveis
        GROUP BY mes, inst
    ),
    com_patrimonio AS (
        SELECT m.mes, m.inst, m.data_referencia_max,
               (SELECT patrimonio_total
                FROM meses_disponiveis md
                WHERE md.mes = m.mes AND md.inst = m.inst AND md.data_referencia = m.data_referencia_max
                LIMIT 1) AS patrimonio_total
        FROM melhor_por_mes_inst m
    ),
    fechados_por_mes_inst AS (
        SELECT mes_referencia AS mes, instituicao AS inst, data_referencia, patrimonio_total, frozen_at
        FROM snapshots_fechados
        WHERE cliente_id = p_cliente_id
    ),
    meses_agregados AS (
        SELECT mes
        FROM com_patrimonio
        UNION
        SELECT mes FROM fechados_por_mes_inst
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'mes_referencia', ma.mes,
            'instituicoes', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'instituicao', i.inst,
                        'disponivel_data_referencia', cp.data_referencia_max,
                        'disponivel_patrimonio', cp.patrimonio_total,
                        'fechado_data_referencia', fp.data_referencia,
                        'fechado_patrimonio', fp.patrimonio_total,
                        'fechado_em', fp.frozen_at
                    ) ORDER BY i.inst
                )
                FROM (
                    SELECT 'BTG' AS inst UNION ALL SELECT 'XP' UNION ALL SELECT 'AVENUE' UNION ALL SELECT 'AGORA'
                ) AS i
                LEFT JOIN com_patrimonio cp        ON cp.mes = ma.mes AND cp.inst = i.inst
                LEFT JOIN fechados_por_mes_inst fp ON fp.mes = ma.mes AND fp.inst = i.inst
                WHERE cp.data_referencia_max IS NOT NULL OR fp.data_referencia IS NOT NULL
            )
        ) ORDER BY ma.mes DESC
    )
    INTO v_result
    FROM meses_agregados ma;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION listar_meses_fechamento(uuid) TO authenticated;
