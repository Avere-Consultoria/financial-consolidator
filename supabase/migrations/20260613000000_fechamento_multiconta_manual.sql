-- ═══════════════════════════════════════════════════════════════════════════
-- Fechamento de mês: multi-conta + instituições manuais.
--
-- O subsistema antigo assumia 1 snapshot por (cliente, instituição) e só as 4
-- APIs. Aqui:
--   • snapshots_fechados/posicoes_fechadas ganham conta_id (a unidade vira a CONTA)
--   • drop do CHECK que restringia instituicao às 4 APIs (libera manual)
--   • fechar_mes itera POR CONTA, em todas as fontes (BTG/XP/Avenue/Ágora + manual)
--   • listar_meses_fechamento passa a reportar por conta
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Schema ────────────────────────────────────────────────────────────────
ALTER TABLE posicao_manual_snapshots ADD COLUMN IF NOT EXISTS is_month_end BOOLEAN DEFAULT FALSE;

ALTER TABLE snapshots_fechados ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES cliente_contas(id) ON DELETE CASCADE;
ALTER TABLE posicoes_fechadas  ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES cliente_contas(id) ON DELETE CASCADE;

-- Libera instituições manuais (remove o CHECK das 4 APIs)
ALTER TABLE snapshots_fechados DROP CONSTRAINT IF EXISTS chk_instituicao_valida;

-- Unicidade passa a ser por CONTA
ALTER TABLE snapshots_fechados DROP CONSTRAINT IF EXISTS uq_snapshot_fechado_cliente_inst_mes;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='snapshots_fechados'::regclass AND conname='uq_snapshot_fechado_conta_mes') THEN
        ALTER TABLE snapshots_fechados ADD CONSTRAINT uq_snapshot_fechado_conta_mes UNIQUE (cliente_id, conta_id, mes_referencia);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_snapfech_conta ON snapshots_fechados (conta_id);

-- ── 2. fechar_mes (por conta + manual) ───────────────────────────────────────
-- Drop antes: CREATE OR REPLACE não renomeia parâmetro (a versão antiga usava p_auto_fechado).
DROP FUNCTION IF EXISTS fechar_mes(uuid, text, uuid, boolean);
DROP FUNCTION IF EXISTS fechar_mes(uuid, text, uuid);

CREATE OR REPLACE FUNCTION fechar_mes(
    p_cliente_id     uuid,
    p_mes_referencia text,
    p_consultor_id   uuid DEFAULT NULL,
    p_auto           boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mes_inicio  date;
    v_mes_fim     date;
    v_rec         record;
    v_fechado_id  uuid;
    v_total       int := 0;
BEGIN
    IF p_cliente_id IS NULL OR p_mes_referencia IS NULL THEN
        RAISE EXCEPTION 'cliente_id e mes_referencia são obrigatórios';
    END IF;
    IF p_mes_referencia !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'mes_referencia deve estar no formato YYYY-MM';
    END IF;

    v_mes_inicio := (p_mes_referencia || '-01')::date;
    v_mes_fim    := (v_mes_inicio + interval '1 month' - interval '1 day')::date;

    -- Idempotência: refaz o mês inteiro (todas as contas)
    DELETE FROM snapshots_fechados WHERE cliente_id = p_cliente_id AND mes_referencia = p_mes_referencia;

    -- ═══ BTG (por conta) ═══
    FOR v_rec IN
        SELECT DISTINCT ON (s.conta_id) s.id, s.conta_id, s.data_referencia, s.patrimonio_total
        FROM posicao_btg_snapshots s
        WHERE s.cliente_id = p_cliente_id AND s.data_referencia BETWEEN v_mes_inicio AND v_mes_fim
        ORDER BY s.conta_id, s.data_referencia DESC
    LOOP
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, 'BTG', p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.maturity_date),
            COALESCE(c.taxa_canonica, p.rentabilidade), COALESCE(c.benchmark_canonico, p.benchmark),
            p.valor_bruto, p.valor_liquido, p.quantidade, p.preco_mercado, 'BTG',
            COALESCE(d.codigo_identificador, p.isin, p.cetip_code, p.ticker, p.security_code),
            COALESCE(d.tipo_identificador, CASE WHEN p.isin IS NOT NULL THEN 'ISIN' WHEN p.cetip_code IS NOT NULL THEN 'ISIN' ELSE 'TICKER' END)
        FROM posicao_btg_ativos p
        LEFT JOIN ativos_canonicos c           ON c.id = p.ativo_canonico_id
        LEFT JOIN excecoes_classificacao e_cli ON e_cli.ativo_canonico_id = p.ativo_canonico_id AND e_cli.consultor_id = p_consultor_id AND e_cli.cliente_id = p_cliente_id
        LEFT JOIN excecoes_classificacao e_glo ON e_glo.ativo_canonico_id = p.ativo_canonico_id AND e_glo.consultor_id = p_consultor_id AND e_glo.cliente_id IS NULL
        LEFT JOIN dicionario_ativos d          ON d.ativo_canonico_id = p.ativo_canonico_id AND d.instituicao_origem = 'BTG'
        LEFT JOIN dicionario_emissores em      ON em.id = COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id)
        WHERE p.snapshot_id = v_rec.id;

        UPDATE posicao_btg_snapshots SET is_month_end = true WHERE id = v_rec.id;
        v_total := v_total + 1;
    END LOOP;

    -- ═══ XP (por conta) ═══
    FOR v_rec IN
        SELECT DISTINCT ON (s.conta_id) s.id, s.conta_id, s.data_referencia, s.patrimonio_total
        FROM posicao_xp_snapshots s
        WHERE s.cliente_id = p_cliente_id AND s.data_referencia BETWEEN v_mes_inicio AND v_mes_fim
        ORDER BY s.conta_id, s.data_referencia DESC
    LOOP
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, 'XP', p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.nome, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            c.taxa_canonica, COALESCE(c.benchmark_canonico, p.benchmark),
            p.valor_bruto, p.valor_liquido, p.quantidade, p.preco_unitario, 'XP',
            COALESCE(d.codigo_identificador, p.isin, p.cnpj, p.codigo_ativo, p.ticker),
            COALESCE(d.tipo_identificador, CASE WHEN p.isin IS NOT NULL THEN 'ISIN' WHEN p.cnpj IS NOT NULL THEN 'CNPJ' ELSE 'TICKER' END)
        FROM posicao_xp_ativos p
        LEFT JOIN ativos_canonicos c           ON c.id = p.ativo_canonico_id
        LEFT JOIN excecoes_classificacao e_cli ON e_cli.ativo_canonico_id = p.ativo_canonico_id AND e_cli.consultor_id = p_consultor_id AND e_cli.cliente_id = p_cliente_id
        LEFT JOIN excecoes_classificacao e_glo ON e_glo.ativo_canonico_id = p.ativo_canonico_id AND e_glo.consultor_id = p_consultor_id AND e_glo.cliente_id IS NULL
        LEFT JOIN dicionario_ativos d          ON d.ativo_canonico_id = p.ativo_canonico_id AND d.instituicao_origem = 'XP'
        LEFT JOIN dicionario_emissores em      ON em.id = COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id)
        WHERE p.snapshot_id = v_rec.id;

        UPDATE posicao_xp_snapshots SET is_month_end = true WHERE id = v_rec.id;
        v_total := v_total + 1;
    END LOOP;

    -- ═══ Avenue (por conta) ═══
    FOR v_rec IN
        SELECT DISTINCT ON (s.conta_id) s.id, s.conta_id, s.data_referencia, s.patrimonio_total
        FROM posicao_avenue_snapshots s
        WHERE s.cliente_id = p_cliente_id AND s.data_referencia BETWEEN v_mes_inicio AND v_mes_fim
        ORDER BY s.conta_id, s.data_referencia DESC
    LOOP
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, 'AVENUE', p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.nome),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.maturity_date),
            c.taxa_canonica, c.benchmark_canonico,
            p.valor_bruto_brl, p.valor_bruto_brl, p.quantidade, NULL, 'AVENUE',
            COALESCE(d.codigo_identificador, p.isin, p.cusip, p.ticker),
            COALESCE(d.tipo_identificador, CASE WHEN p.isin IS NOT NULL THEN 'ISIN' WHEN p.cusip IS NOT NULL THEN 'CUSIP' ELSE 'TICKER' END)
        FROM posicao_avenue_ativos p
        LEFT JOIN ativos_canonicos c           ON c.id = p.ativo_canonico_id
        LEFT JOIN excecoes_classificacao e_cli ON e_cli.ativo_canonico_id = p.ativo_canonico_id AND e_cli.consultor_id = p_consultor_id AND e_cli.cliente_id = p_cliente_id
        LEFT JOIN excecoes_classificacao e_glo ON e_glo.ativo_canonico_id = p.ativo_canonico_id AND e_glo.consultor_id = p_consultor_id AND e_glo.cliente_id IS NULL
        LEFT JOIN dicionario_ativos d          ON d.ativo_canonico_id = p.ativo_canonico_id AND d.instituicao_origem = 'AVENUE'
        LEFT JOIN dicionario_emissores em      ON em.id = COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id)
        WHERE p.snapshot_id = v_rec.id;

        UPDATE posicao_avenue_snapshots SET is_month_end = true WHERE id = v_rec.id;
        v_total := v_total + 1;
    END LOOP;

    -- ═══ Ágora (por conta) ═══
    FOR v_rec IN
        SELECT DISTINCT ON (s.conta_id) s.id, s.conta_id, s.data_referencia, s.patrimonio_total
        FROM posicao_agora_snapshots s
        WHERE s.cliente_id = p_cliente_id AND s.data_referencia BETWEEN v_mes_inicio AND v_mes_fim
        ORDER BY s.conta_id, s.data_referencia DESC
    LOOP
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, 'AGORA', p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            COALESCE(c.taxa_canonica, p.taxa), c.benchmark_canonico,
            p.valor_bruto, p.valor_liquido, p.quantidade, p.preco_unitario, 'AGORA',
            COALESCE(d.codigo_identificador, p.security_code, p.ticker),
            COALESCE(d.tipo_identificador, CASE WHEN p.security_code IS NOT NULL THEN 'ISIN' ELSE 'TICKER' END)
        FROM posicao_agora_ativos p
        LEFT JOIN ativos_canonicos c           ON c.id = p.ativo_canonico_id
        LEFT JOIN excecoes_classificacao e_cli ON e_cli.ativo_canonico_id = p.ativo_canonico_id AND e_cli.consultor_id = p_consultor_id AND e_cli.cliente_id = p_cliente_id
        LEFT JOIN excecoes_classificacao e_glo ON e_glo.ativo_canonico_id = p.ativo_canonico_id AND e_glo.consultor_id = p_consultor_id AND e_glo.cliente_id IS NULL
        LEFT JOIN dicionario_ativos d          ON d.ativo_canonico_id = p.ativo_canonico_id AND d.instituicao_origem = 'AGORA'
        LEFT JOIN dicionario_emissores em      ON em.id = COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id)
        WHERE p.snapshot_id = v_rec.id;

        UPDATE posicao_agora_snapshots SET is_month_end = true WHERE id = v_rec.id;
        v_total := v_total + 1;
    END LOOP;

    -- ═══ Manual (por conta; instituicao = nome da instituição manual) ═══
    FOR v_rec IN
        SELECT DISTINCT ON (s.conta_id) s.id, s.conta_id, s.instituicao, s.data_referencia, s.patrimonio_total
        FROM posicao_manual_snapshots s
        WHERE s.cliente_id = p_cliente_id AND s.data_referencia BETWEEN v_mes_inicio AND v_mes_fim
        ORDER BY s.conta_id, s.data_referencia DESC
    LOOP
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, v_rec.instituicao, p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            COALESCE(c.taxa_canonica, p.rentabilidade), COALESCE(c.benchmark_canonico, p.benchmark),
            p.valor_bruto, COALESCE(p.valor_liquido, p.valor_bruto), p.quantidade, p.preco_mercado, v_rec.instituicao,
            COALESCE(d.codigo_identificador, p.isin, p.cnpj, p.ticker),
            COALESCE(d.tipo_identificador, CASE WHEN p.isin IS NOT NULL THEN 'ISIN' WHEN p.cnpj IS NOT NULL THEN 'CNPJ' ELSE 'TICKER' END)
        FROM posicao_manual_ativos p
        LEFT JOIN ativos_canonicos c           ON c.id = p.ativo_canonico_id
        LEFT JOIN excecoes_classificacao e_cli ON e_cli.ativo_canonico_id = p.ativo_canonico_id AND e_cli.consultor_id = p_consultor_id AND e_cli.cliente_id = p_cliente_id
        LEFT JOIN excecoes_classificacao e_glo ON e_glo.ativo_canonico_id = p.ativo_canonico_id AND e_glo.consultor_id = p_consultor_id AND e_glo.cliente_id IS NULL
        LEFT JOIN dicionario_ativos d          ON d.ativo_canonico_id = p.ativo_canonico_id AND d.instituicao_origem = v_rec.instituicao
        LEFT JOIN dicionario_emissores em      ON em.id = COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id)
        WHERE p.snapshot_id = v_rec.id;

        UPDATE posicao_manual_snapshots SET is_month_end = true WHERE id = v_rec.id;
        v_total := v_total + 1;
    END LOOP;

    RETURN jsonb_build_object('sucesso', true, 'cliente_id', p_cliente_id, 'mes_referencia', p_mes_referencia, 'contas_fechadas', v_total);
END;
$$;

GRANT EXECUTE ON FUNCTION fechar_mes(uuid, text, uuid, boolean) TO authenticated;

-- ── 3. listar_meses_fechamento (por conta + manual) ──────────────────────────
CREATE OR REPLACE FUNCTION listar_meses_fechamento(p_cliente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH vivos AS (
        SELECT to_char(data_referencia,'YYYY-MM') AS mes, conta_id, 'BTG'    AS inst, data_referencia, patrimonio_total FROM posicao_btg_snapshots    WHERE cliente_id = p_cliente_id
        UNION ALL
        SELECT to_char(data_referencia,'YYYY-MM'), conta_id, 'XP',     data_referencia, patrimonio_total FROM posicao_xp_snapshots     WHERE cliente_id = p_cliente_id
        UNION ALL
        SELECT to_char(data_referencia,'YYYY-MM'), conta_id, 'AVENUE', data_referencia, patrimonio_total FROM posicao_avenue_snapshots WHERE cliente_id = p_cliente_id
        UNION ALL
        SELECT to_char(data_referencia,'YYYY-MM'), conta_id, 'AGORA',  data_referencia, patrimonio_total FROM posicao_agora_snapshots  WHERE cliente_id = p_cliente_id
        UNION ALL
        SELECT to_char(data_referencia,'YYYY-MM'), conta_id, instituicao, data_referencia, patrimonio_total FROM posicao_manual_snapshots WHERE cliente_id = p_cliente_id
    ),
    melhor AS (  -- snapshot mais recente por (mes, conta)
        SELECT DISTINCT ON (mes, conta_id) mes, conta_id, inst, data_referencia, patrimonio_total
        FROM vivos
        ORDER BY mes, conta_id, data_referencia DESC
    ),
    fechados AS (
        SELECT mes_referencia AS mes, conta_id, instituicao AS inst, data_referencia, patrimonio_total, frozen_at
        FROM snapshots_fechados WHERE cliente_id = p_cliente_id
    ),
    chaves AS (
        SELECT mes, conta_id FROM melhor
        UNION
        SELECT mes, conta_id FROM fechados
    )
    SELECT jsonb_agg(x ORDER BY x->>'mes_referencia' DESC) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'mes_referencia', k.mes,
            'contas', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'conta_id', kk.conta_id,
                        'instituicao', COALESCE(m.inst, f.inst),
                        'disponivel_data_referencia', m.data_referencia,
                        'disponivel_patrimonio', m.patrimonio_total,
                        'fechado_data_referencia', f.data_referencia,
                        'fechado_patrimonio', f.patrimonio_total,
                        'fechado_em', f.frozen_at
                    ) ORDER BY COALESCE(m.inst, f.inst)
                )
                FROM chaves kk
                LEFT JOIN melhor m   ON m.mes = kk.mes AND m.conta_id IS NOT DISTINCT FROM kk.conta_id
                LEFT JOIN fechados f ON f.mes = kk.mes AND f.conta_id IS NOT DISTINCT FROM kk.conta_id
                WHERE kk.mes = k.mes
            )
        ) AS x
        FROM (SELECT DISTINCT mes FROM chaves) k
    ) t;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION listar_meses_fechamento(uuid) TO authenticated;
