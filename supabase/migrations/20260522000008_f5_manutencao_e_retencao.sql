-- ═══════════════════════════════════════════════════════════════════════════
-- Manutenção & Retenção
--
-- 1. Adiciona coluna auto_fechado em snapshots_fechados
-- 2. Reescreve fechar_mes() — agora aceita consultor_id NULL + flag auto
-- 3. Função listar_manutencao_status() — preview pro front
-- 4. Função auto_fechar_meses_pendentes() — fecha em batch meses elegíveis
-- 5. Função podar_snapshots_diarios() — apaga snapshots vivos não-mês-corrente
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. snapshots_fechados.auto_fechado
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE snapshots_fechados
    ADD COLUMN IF NOT EXISTS auto_fechado boolean NOT NULL DEFAULT false;


-- ───────────────────────────────────────────────────────────────────────────
-- 2. fechar_mes — reescrita para aceitar consultor_id NULL + flag auto
-- ───────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS fechar_mes(uuid, text, uuid);
DROP FUNCTION IF EXISTS fechar_mes(uuid, text, uuid, boolean);

CREATE OR REPLACE FUNCTION fechar_mes(
    p_cliente_id     uuid,
    p_mes_referencia text,
    p_consultor_id   uuid    DEFAULT NULL,
    p_auto_fechado   boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mes_inicio       date;
    v_mes_fim          date;
    v_fechamentos      jsonb := '[]'::jsonb;

    v_snapshot_id      uuid;
    v_data_ref         date;
    v_patrimonio       numeric;
    v_fechado_id       uuid;
    v_ativos_count     int;
BEGIN
    IF p_cliente_id IS NULL OR p_mes_referencia IS NULL THEN
        RAISE EXCEPTION 'cliente_id e mes_referencia são obrigatórios';
    END IF;

    IF p_mes_referencia !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'mes_referencia deve estar no formato YYYY-MM';
    END IF;

    v_mes_inicio := (p_mes_referencia || '-01')::date;
    v_mes_fim    := (v_mes_inicio + interval '1 month' - interval '1 day')::date;

    -- Idempotência
    DELETE FROM snapshots_fechados
    WHERE cliente_id = p_cliente_id AND mes_referencia = p_mes_referencia;

    -- ═══════════════════════════════════════════════════════════════════
    -- BTG
    -- ═══════════════════════════════════════════════════════════════════
    v_snapshot_id := NULL; v_data_ref := NULL; v_patrimonio := NULL; v_ativos_count := 0;

    SELECT id, data_referencia, patrimonio_total
    INTO v_snapshot_id, v_data_ref, v_patrimonio
    FROM posicao_btg_snapshots
    WHERE cliente_id = p_cliente_id AND data_referencia BETWEEN v_mes_inicio AND v_mes_fim
    ORDER BY data_referencia DESC LIMIT 1;

    IF v_snapshot_id IS NOT NULL THEN
        INSERT INTO snapshots_fechados (cliente_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by, auto_fechado)
        VALUES (p_cliente_id, 'BTG', p_mes_referencia, v_data_ref, v_snapshot_id, v_patrimonio, p_consultor_id, p_auto_fechado)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo, ''), NULLIF(e_glo.apelido_ativo, ''), c.nome_canonico, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.maturity_date),
            COALESCE(c.taxa_canonica, p.rentabilidade),
            COALESCE(c.benchmark_canonico, p.benchmark),
            p.valor_bruto, p.valor_liquido, p.quantidade, p.preco_mercado, 'BTG',
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

    v_fechamentos := v_fechamentos || jsonb_build_array(jsonb_build_object('instituicao', 'BTG', 'data_referencia', v_data_ref, 'patrimonio_total', v_patrimonio, 'ativos_materializados', v_ativos_count));

    -- ═══════════════════════════════════════════════════════════════════
    -- XP
    -- ═══════════════════════════════════════════════════════════════════
    v_snapshot_id := NULL; v_data_ref := NULL; v_patrimonio := NULL; v_ativos_count := 0;

    SELECT id, data_referencia, patrimonio_total
    INTO v_snapshot_id, v_data_ref, v_patrimonio
    FROM posicao_xp_snapshots
    WHERE cliente_id = p_cliente_id AND data_referencia BETWEEN v_mes_inicio AND v_mes_fim
    ORDER BY data_referencia DESC LIMIT 1;

    IF v_snapshot_id IS NOT NULL THEN
        INSERT INTO snapshots_fechados (cliente_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by, auto_fechado)
        VALUES (p_cliente_id, 'XP', p_mes_referencia, v_data_ref, v_snapshot_id, v_patrimonio, p_consultor_id, p_auto_fechado)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo, ''), NULLIF(e_glo.apelido_ativo, ''), c.nome_canonico, p.nome, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            c.taxa_canonica,
            COALESCE(c.benchmark_canonico, p.benchmark),
            p.valor_bruto, p.valor_liquido, p.quantidade, p.preco_unitario, 'XP',
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

    v_fechamentos := v_fechamentos || jsonb_build_array(jsonb_build_object('instituicao', 'XP', 'data_referencia', v_data_ref, 'patrimonio_total', v_patrimonio, 'ativos_materializados', v_ativos_count));

    -- ═══════════════════════════════════════════════════════════════════
    -- Avenue
    -- ═══════════════════════════════════════════════════════════════════
    v_snapshot_id := NULL; v_data_ref := NULL; v_patrimonio := NULL; v_ativos_count := 0;

    SELECT id, data_referencia, patrimonio_total
    INTO v_snapshot_id, v_data_ref, v_patrimonio
    FROM posicao_avenue_snapshots
    WHERE cliente_id = p_cliente_id AND data_referencia BETWEEN v_mes_inicio AND v_mes_fim
    ORDER BY data_referencia DESC LIMIT 1;

    IF v_snapshot_id IS NOT NULL THEN
        INSERT INTO snapshots_fechados (cliente_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by, auto_fechado)
        VALUES (p_cliente_id, 'AVENUE', p_mes_referencia, v_data_ref, v_snapshot_id, v_patrimonio, p_consultor_id, p_auto_fechado)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo, ''), NULLIF(e_glo.apelido_ativo, ''), c.nome_canonico, p.nome),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.maturity_date),
            c.taxa_canonica,
            c.benchmark_canonico,
            p.valor_bruto_brl, p.valor_bruto_brl, p.quantidade, NULL, 'AVENUE',
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

    v_fechamentos := v_fechamentos || jsonb_build_array(jsonb_build_object('instituicao', 'AVENUE', 'data_referencia', v_data_ref, 'patrimonio_total', v_patrimonio, 'ativos_materializados', v_ativos_count));

    -- ═══════════════════════════════════════════════════════════════════
    -- Ágora
    -- ═══════════════════════════════════════════════════════════════════
    v_snapshot_id := NULL; v_data_ref := NULL; v_patrimonio := NULL; v_ativos_count := 0;

    SELECT id, data_referencia, patrimonio_total
    INTO v_snapshot_id, v_data_ref, v_patrimonio
    FROM posicao_agora_snapshots
    WHERE cliente_id = p_cliente_id AND data_referencia BETWEEN v_mes_inicio AND v_mes_fim
    ORDER BY data_referencia DESC LIMIT 1;

    IF v_snapshot_id IS NOT NULL THEN
        INSERT INTO snapshots_fechados (cliente_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by, auto_fechado)
        VALUES (p_cliente_id, 'AGORA', p_mes_referencia, v_data_ref, v_snapshot_id, v_patrimonio, p_consultor_id, p_auto_fechado)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo, ''), NULLIF(e_glo.apelido_ativo, ''), c.nome_canonico, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            COALESCE(c.taxa_canonica, p.taxa),
            c.benchmark_canonico,
            p.valor_bruto, p.valor_liquido, p.quantidade, p.preco_unitario, 'AGORA',
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

    v_fechamentos := v_fechamentos || jsonb_build_array(jsonb_build_object('instituicao', 'AGORA', 'data_referencia', v_data_ref, 'patrimonio_total', v_patrimonio, 'ativos_materializados', v_ativos_count));

    RETURN jsonb_build_object('sucesso', true, 'cliente_id', p_cliente_id, 'mes_referencia', p_mes_referencia, 'auto_fechado', p_auto_fechado, 'fechamentos', v_fechamentos);
END;
$$;

GRANT EXECUTE ON FUNCTION fechar_mes(uuid, text, uuid, boolean) TO authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- 3. listar_manutencao_status — preview pro front
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION listar_manutencao_status(p_dias_buffer int DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_mes_corrente text;
    v_elegiveis jsonb;
    v_no_buffer jsonb;
    v_snapshots_a_podar jsonb;
BEGIN
    v_mes_corrente := to_char(now(), 'YYYY-MM');

    WITH meses_com_snapshots AS (
        SELECT cliente_id, to_char(data_referencia, 'YYYY-MM') AS mes,
               COUNT(DISTINCT inst) AS inst_count
        FROM (
            SELECT cliente_id, data_referencia, 'BTG'    AS inst FROM posicao_btg_snapshots
            UNION ALL
            SELECT cliente_id, data_referencia, 'XP'            FROM posicao_xp_snapshots
            UNION ALL
            SELECT cliente_id, data_referencia, 'AVENUE'        FROM posicao_avenue_snapshots
            UNION ALL
            SELECT cliente_id, data_referencia, 'AGORA'         FROM posicao_agora_snapshots
        ) t
        GROUP BY cliente_id, to_char(data_referencia, 'YYYY-MM')
    ),
    candidatos AS (
        SELECT m.cliente_id, m.mes, m.inst_count, c.nome AS cliente_nome,
               ((m.mes || '-01')::date + interval '1 month' - interval '1 day')::date AS fim_mes
        FROM meses_com_snapshots m
        JOIN clientes c ON c.id = m.cliente_id
        WHERE m.mes != v_mes_corrente
          AND NOT EXISTS (
              SELECT 1 FROM snapshots_fechados sf
              WHERE sf.cliente_id = m.cliente_id AND sf.mes_referencia = m.mes
          )
    )
    SELECT
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'cliente_id', cliente_id, 'cliente_nome', cliente_nome,
            'mes_referencia', mes, 'instituicoes_count', inst_count,
            'fim_mes', fim_mes, 'dias_desde_fim_mes', (CURRENT_DATE - fim_mes)
        ) ORDER BY cliente_nome, mes)
        FROM candidatos WHERE (CURRENT_DATE - fim_mes) > p_dias_buffer), '[]'::jsonb),
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'cliente_id', cliente_id, 'cliente_nome', cliente_nome,
            'mes_referencia', mes, 'instituicoes_count', inst_count,
            'fim_mes', fim_mes, 'dias_desde_fim_mes', (CURRENT_DATE - fim_mes),
            'dias_para_auto_fechar', GREATEST(0, p_dias_buffer - (CURRENT_DATE - fim_mes))
        ) ORDER BY cliente_nome, mes)
        FROM candidatos WHERE (CURRENT_DATE - fim_mes) <= p_dias_buffer), '[]'::jsonb)
    INTO v_elegiveis, v_no_buffer;

    SELECT jsonb_build_object(
        'BTG',    COUNT(*) FILTER (WHERE inst = 'BTG'),
        'XP',     COUNT(*) FILTER (WHERE inst = 'XP'),
        'AVENUE', COUNT(*) FILTER (WHERE inst = 'AVENUE'),
        'AGORA',  COUNT(*) FILTER (WHERE inst = 'AGORA'),
        'total',  COUNT(*)
    )
    INTO v_snapshots_a_podar
    FROM (
        SELECT 'BTG'    AS inst FROM posicao_btg_snapshots    WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false
        UNION ALL
        SELECT 'XP'            FROM posicao_xp_snapshots     WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false
        UNION ALL
        SELECT 'AVENUE'        FROM posicao_avenue_snapshots WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false
        UNION ALL
        SELECT 'AGORA'         FROM posicao_agora_snapshots  WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false
    ) t;

    RETURN jsonb_build_object(
        'mes_corrente', v_mes_corrente,
        'dias_buffer', p_dias_buffer,
        'elegiveis_auto_fechamento', v_elegiveis,
        'no_buffer', v_no_buffer,
        'snapshots_a_podar', v_snapshots_a_podar
    );
END;
$$;

GRANT EXECUTE ON FUNCTION listar_manutencao_status(int) TO authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- 4. auto_fechar_meses_pendentes — fecha em batch meses elegíveis
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_fechar_meses_pendentes(p_dias_buffer int DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row    record;
    v_resp   jsonb;
    v_count  int := 0;
    v_detalhes jsonb := '[]'::jsonb;
    v_mes_corrente text;
BEGIN
    v_mes_corrente := to_char(now(), 'YYYY-MM');

    FOR v_row IN
        WITH meses_com_snapshots AS (
            SELECT DISTINCT cliente_id, to_char(data_referencia, 'YYYY-MM') AS mes
            FROM (
                SELECT cliente_id, data_referencia FROM posicao_btg_snapshots
                UNION ALL
                SELECT cliente_id, data_referencia FROM posicao_xp_snapshots
                UNION ALL
                SELECT cliente_id, data_referencia FROM posicao_avenue_snapshots
                UNION ALL
                SELECT cliente_id, data_referencia FROM posicao_agora_snapshots
            ) t
        )
        SELECT m.cliente_id, m.mes, c.consultor_id
        FROM meses_com_snapshots m
        JOIN clientes c ON c.id = m.cliente_id
        WHERE m.mes != v_mes_corrente
          AND NOT EXISTS (
              SELECT 1 FROM snapshots_fechados sf
              WHERE sf.cliente_id = m.cliente_id AND sf.mes_referencia = m.mes
          )
          AND ((((m.mes || '-01')::date + interval '1 month' - interval '1 day')::date) + p_dias_buffer) < CURRENT_DATE
        ORDER BY m.cliente_id, m.mes
    LOOP
        v_resp := fechar_mes(v_row.cliente_id, v_row.mes, v_row.consultor_id, true);
        v_count := v_count + 1;
        v_detalhes := v_detalhes || jsonb_build_array(jsonb_build_object(
            'cliente_id', v_row.cliente_id,
            'mes_referencia', v_row.mes,
            'consultor_id', v_row.consultor_id,
            'resultado', v_resp
        ));
    END LOOP;

    RETURN jsonb_build_object(
        'sucesso', true,
        'total_fechados', v_count,
        'detalhes', v_detalhes
    );
END;
$$;

GRANT EXECUTE ON FUNCTION auto_fechar_meses_pendentes(int) TO authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- 5. podar_snapshots_diarios — apaga snapshots vivos não-mês-corrente
--    Preserva: mes corrente + qualquer snapshot com is_month_end = true
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION podar_snapshots_diarios()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mes_corrente text;
    v_btg int; v_xp int; v_avenue int; v_agora int;
BEGIN
    v_mes_corrente := to_char(now(), 'YYYY-MM');

    -- ── BTG ──
    DELETE FROM posicao_btg_aquisicoes
    WHERE ativo_id IN (
        SELECT a.id FROM posicao_btg_ativos a
        JOIN posicao_btg_snapshots s ON s.id = a.snapshot_id
        WHERE to_char(s.data_referencia, 'YYYY-MM') != v_mes_corrente AND s.is_month_end = false
    );

    DELETE FROM posicao_btg_janelas_liquidez
    WHERE ativo_id IN (
        SELECT a.id FROM posicao_btg_ativos a
        JOIN posicao_btg_snapshots s ON s.id = a.snapshot_id
        WHERE to_char(s.data_referencia, 'YYYY-MM') != v_mes_corrente AND s.is_month_end = false
    );

    DELETE FROM posicao_btg_ativos
    WHERE snapshot_id IN (
        SELECT id FROM posicao_btg_snapshots
        WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false
    );

    DELETE FROM posicao_btg_snapshots
    WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false;
    GET DIAGNOSTICS v_btg = ROW_COUNT;

    -- ── XP ──
    DELETE FROM posicao_xp_ativos
    WHERE snapshot_id IN (
        SELECT id FROM posicao_xp_snapshots
        WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false
    );

    DELETE FROM posicao_xp_snapshots
    WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false;
    GET DIAGNOSTICS v_xp = ROW_COUNT;

    -- ── Avenue ──
    DELETE FROM posicao_avenue_ativos
    WHERE snapshot_id IN (
        SELECT id FROM posicao_avenue_snapshots
        WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false
    );

    DELETE FROM posicao_avenue_snapshots
    WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false;
    GET DIAGNOSTICS v_avenue = ROW_COUNT;

    -- ── Ágora ──
    DELETE FROM posicao_agora_ativos
    WHERE snapshot_id IN (
        SELECT id FROM posicao_agora_snapshots
        WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false
    );

    DELETE FROM posicao_agora_snapshots
    WHERE to_char(data_referencia, 'YYYY-MM') != v_mes_corrente AND is_month_end = false;
    GET DIAGNOSTICS v_agora = ROW_COUNT;

    RETURN jsonb_build_object(
        'sucesso', true,
        'snapshots_apagados', v_btg + v_xp + v_avenue + v_agora,
        'por_instituicao', jsonb_build_object('BTG', v_btg, 'XP', v_xp, 'AVENUE', v_avenue, 'AGORA', v_agora)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION podar_snapshots_diarios() TO authenticated;
