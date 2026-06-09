-- ═══════════════════════════════════════════════════════════════════════════
-- Manutenção/retenção: inclui instituições MANUAIS e respeita is_month_end
-- por conta (já garantido pelo novo fechar_mes).
--   • listar_manutencao_status: conta manual nos status e na poda
--   • auto_fechar_meses_pendentes: inclui manual + passa o perfil_id do consultor
--     (excecoes.consultor_id = perfil_id, não consultores.id)
--   • podar_snapshots_diarios: poda também os snapshots manuais antigos
-- (Assinaturas inalteradas → CREATE OR REPLACE direto.)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION listar_manutencao_status(p_dias_buffer int DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    v_mes_corrente text;
    v_elegiveis jsonb;
    v_no_buffer jsonb;
    v_snapshots_a_podar jsonb;
BEGIN
    v_mes_corrente := to_char(now(), 'YYYY-MM');

    WITH meses_com_snapshots AS (
        SELECT cliente_id, to_char(data_referencia, 'YYYY-MM') AS mes, COUNT(DISTINCT inst) AS inst_count
        FROM (
            SELECT cliente_id, data_referencia, 'BTG'    AS inst FROM posicao_btg_snapshots
            UNION ALL SELECT cliente_id, data_referencia, 'XP'     FROM posicao_xp_snapshots
            UNION ALL SELECT cliente_id, data_referencia, 'AVENUE' FROM posicao_avenue_snapshots
            UNION ALL SELECT cliente_id, data_referencia, 'AGORA'  FROM posicao_agora_snapshots
            UNION ALL SELECT cliente_id, data_referencia, instituicao FROM posicao_manual_snapshots
        ) t
        GROUP BY cliente_id, to_char(data_referencia, 'YYYY-MM')
    ),
    candidatos AS (
        SELECT m.cliente_id, m.mes, m.inst_count, c.nome AS cliente_nome,
               ((m.mes || '-01')::date + interval '1 month' - interval '1 day')::date AS fim_mes
        FROM meses_com_snapshots m
        JOIN clientes c ON c.id = m.cliente_id
        WHERE m.mes != v_mes_corrente
          AND NOT EXISTS (SELECT 1 FROM snapshots_fechados sf WHERE sf.cliente_id = m.cliente_id AND sf.mes_referencia = m.mes)
    )
    SELECT
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'cliente_id', cliente_id, 'cliente_nome', cliente_nome, 'mes_referencia', mes,
            'instituicoes_count', inst_count, 'fim_mes', fim_mes, 'dias_desde_fim_mes', (CURRENT_DATE - fim_mes)
        ) ORDER BY cliente_nome, mes) FROM candidatos WHERE (CURRENT_DATE - fim_mes) > p_dias_buffer), '[]'::jsonb),
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'cliente_id', cliente_id, 'cliente_nome', cliente_nome, 'mes_referencia', mes,
            'instituicoes_count', inst_count, 'fim_mes', fim_mes, 'dias_desde_fim_mes', (CURRENT_DATE - fim_mes),
            'dias_para_auto_fechar', GREATEST(0, p_dias_buffer - (CURRENT_DATE - fim_mes))
        ) ORDER BY cliente_nome, mes) FROM candidatos WHERE (CURRENT_DATE - fim_mes) <= p_dias_buffer), '[]'::jsonb)
    INTO v_elegiveis, v_no_buffer;

    SELECT jsonb_build_object(
        'BTG',    COUNT(*) FILTER (WHERE inst = 'BTG'),
        'XP',     COUNT(*) FILTER (WHERE inst = 'XP'),
        'AVENUE', COUNT(*) FILTER (WHERE inst = 'AVENUE'),
        'AGORA',  COUNT(*) FILTER (WHERE inst = 'AGORA'),
        'MANUAL', COUNT(*) FILTER (WHERE inst = 'MANUAL'),
        'total',  COUNT(*)
    )
    INTO v_snapshots_a_podar
    FROM (
        SELECT 'BTG'    AS inst FROM posicao_btg_snapshots    WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false
        UNION ALL SELECT 'XP'     FROM posicao_xp_snapshots     WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false
        UNION ALL SELECT 'AVENUE' FROM posicao_avenue_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false
        UNION ALL SELECT 'AGORA'  FROM posicao_agora_snapshots  WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false
        UNION ALL SELECT 'MANUAL' FROM posicao_manual_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false
    ) t;

    RETURN jsonb_build_object(
        'mes_corrente', v_mes_corrente, 'dias_buffer', p_dias_buffer,
        'elegiveis_auto_fechamento', v_elegiveis, 'no_buffer', v_no_buffer,
        'snapshots_a_podar', v_snapshots_a_podar
    );
END;
$$;
GRANT EXECUTE ON FUNCTION listar_manutencao_status(int) TO authenticated;


CREATE OR REPLACE FUNCTION auto_fechar_meses_pendentes(p_dias_buffer int DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_row record; v_resp jsonb; v_count int := 0; v_detalhes jsonb := '[]'::jsonb; v_mes_corrente text;
BEGIN
    v_mes_corrente := to_char(now(), 'YYYY-MM');

    FOR v_row IN
        WITH meses_com_snapshots AS (
            SELECT DISTINCT cliente_id, to_char(data_referencia, 'YYYY-MM') AS mes
            FROM (
                SELECT cliente_id, data_referencia FROM posicao_btg_snapshots
                UNION ALL SELECT cliente_id, data_referencia FROM posicao_xp_snapshots
                UNION ALL SELECT cliente_id, data_referencia FROM posicao_avenue_snapshots
                UNION ALL SELECT cliente_id, data_referencia FROM posicao_agora_snapshots
                UNION ALL SELECT cliente_id, data_referencia FROM posicao_manual_snapshots
            ) t
        )
        SELECT m.cliente_id, m.mes, co.perfil_id AS consultor_perfil_id
        FROM meses_com_snapshots m
        JOIN clientes c ON c.id = m.cliente_id
        LEFT JOIN consultores co ON co.id = c.consultor_id
        WHERE m.mes != v_mes_corrente
          AND NOT EXISTS (SELECT 1 FROM snapshots_fechados sf WHERE sf.cliente_id = m.cliente_id AND sf.mes_referencia = m.mes)
          AND ((((m.mes || '-01')::date + interval '1 month' - interval '1 day')::date) + p_dias_buffer) < CURRENT_DATE
        ORDER BY m.cliente_id, m.mes
    LOOP
        v_resp := fechar_mes(v_row.cliente_id, v_row.mes, v_row.consultor_perfil_id, true);
        v_count := v_count + 1;
        v_detalhes := v_detalhes || jsonb_build_array(jsonb_build_object(
            'cliente_id', v_row.cliente_id, 'mes_referencia', v_row.mes, 'resultado', v_resp
        ));
    END LOOP;

    RETURN jsonb_build_object('sucesso', true, 'total_fechados', v_count, 'detalhes', v_detalhes);
END;
$$;
GRANT EXECUTE ON FUNCTION auto_fechar_meses_pendentes(int) TO authenticated;


CREATE OR REPLACE FUNCTION podar_snapshots_diarios()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_mes_corrente text;
    v_btg int; v_xp int; v_avenue int; v_agora int; v_manual int;
BEGIN
    v_mes_corrente := to_char(now(), 'YYYY-MM');

    -- BTG
    DELETE FROM posicao_btg_aquisicoes WHERE ativo_id IN (
        SELECT a.id FROM posicao_btg_ativos a JOIN posicao_btg_snapshots s ON s.id = a.snapshot_id
        WHERE to_char(s.data_referencia,'YYYY-MM') != v_mes_corrente AND s.is_month_end = false);
    DELETE FROM posicao_btg_janelas_liquidez WHERE ativo_id IN (
        SELECT a.id FROM posicao_btg_ativos a JOIN posicao_btg_snapshots s ON s.id = a.snapshot_id
        WHERE to_char(s.data_referencia,'YYYY-MM') != v_mes_corrente AND s.is_month_end = false);
    DELETE FROM posicao_btg_ativos WHERE snapshot_id IN (
        SELECT id FROM posicao_btg_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false);
    DELETE FROM posicao_btg_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false;
    GET DIAGNOSTICS v_btg = ROW_COUNT;

    -- XP
    DELETE FROM posicao_xp_ativos WHERE snapshot_id IN (
        SELECT id FROM posicao_xp_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false);
    DELETE FROM posicao_xp_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false;
    GET DIAGNOSTICS v_xp = ROW_COUNT;

    -- Avenue
    DELETE FROM posicao_avenue_ativos WHERE snapshot_id IN (
        SELECT id FROM posicao_avenue_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false);
    DELETE FROM posicao_avenue_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false;
    GET DIAGNOSTICS v_avenue = ROW_COUNT;

    -- Ágora
    DELETE FROM posicao_agora_ativos WHERE snapshot_id IN (
        SELECT id FROM posicao_agora_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false);
    DELETE FROM posicao_agora_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false;
    GET DIAGNOSTICS v_agora = ROW_COUNT;

    -- Manual
    DELETE FROM posicao_manual_ativos WHERE snapshot_id IN (
        SELECT id FROM posicao_manual_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false);
    DELETE FROM posicao_manual_snapshots WHERE to_char(data_referencia,'YYYY-MM') != v_mes_corrente AND is_month_end = false;
    GET DIAGNOSTICS v_manual = ROW_COUNT;

    RETURN jsonb_build_object(
        'sucesso', true,
        'snapshots_apagados', v_btg + v_xp + v_avenue + v_agora + v_manual,
        'por_instituicao', jsonb_build_object('BTG', v_btg, 'XP', v_xp, 'AVENUE', v_avenue, 'AGORA', v_agora, 'MANUAL', v_manual)
    );
END;
$$;
GRANT EXECUTE ON FUNCTION podar_snapshots_diarios() TO authenticated;
