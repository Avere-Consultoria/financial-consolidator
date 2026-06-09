-- ═══════════════════════════════════════════════════════════════════════════
-- Relatório fechado = Home daquele mês (read-only / foto fiel).
--
-- A Home usa campos que NÃO eram carimbados no fechamento. Como a poda apaga o
-- snapshot vivo, depois de podado não há como recalcular — então congelamos:
--   posicoes_fechadas:
--     • sub_tipo         → roteia FGC × Crédito Privado + liquidez por subtipo
--     • conglomerado_id  → gráfico de Crédito Bancário (FGC)
--     • asset_class      → separa Previdência / RV / Caixa
--     • taxa_formatada   → exibição "IPCA + 5,89%"
--   snapshots_fechados:
--     • saldo_caixa_outros → fatia "Conta Corrente / Outros" (BTG: cc+cripto; XP: coe)
--
-- fechar_mes reescrito para carimbar tudo. Assinatura inalterada → CREATE OR REPLACE.
-- Meses já fechados precisam ser RE-fechados (idempotente) para preencher os campos.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Schema ────────────────────────────────────────────────────────────────
ALTER TABLE posicoes_fechadas  ADD COLUMN IF NOT EXISTS sub_tipo        text;
ALTER TABLE posicoes_fechadas  ADD COLUMN IF NOT EXISTS conglomerado_id uuid;
ALTER TABLE posicoes_fechadas  ADD COLUMN IF NOT EXISTS asset_class     text;
ALTER TABLE posicoes_fechadas  ADD COLUMN IF NOT EXISTS taxa_formatada  text;
ALTER TABLE snapshots_fechados ADD COLUMN IF NOT EXISTS saldo_caixa_outros numeric NOT NULL DEFAULT 0;

-- ── 2. fechar_mes (carimba os campos da Home) ────────────────────────────────
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
        SELECT DISTINCT ON (s.conta_id) s.id, s.conta_id, s.data_referencia, s.patrimonio_total, s.saldo_cc, s.saldo_cripto
        FROM posicao_btg_snapshots s
        WHERE s.cliente_id = p_cliente_id AND s.data_referencia BETWEEN v_mes_inicio AND v_mes_fim
        ORDER BY s.conta_id, s.data_referencia DESC
    LOOP
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, saldo_caixa_outros, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, 'BTG', p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, COALESCE(v_rec.saldo_cc,0) + COALESCE(v_rec.saldo_cripto,0), p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, sub_tipo, conglomerado_id, asset_class, taxa_formatada, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.maturity_date),
            COALESCE(c.taxa_canonica, p.rentabilidade), COALESCE(c.benchmark_canonico, p.benchmark),
            COALESCE(c.sub_tipo_canonico, p.sub_tipo), c.conglomerado_id, p.asset_class, c.taxa_formatada,
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
        SELECT DISTINCT ON (s.conta_id) s.id, s.conta_id, s.data_referencia, s.patrimonio_total, s.saldo_coe
        FROM posicao_xp_snapshots s
        WHERE s.cliente_id = p_cliente_id AND s.data_referencia BETWEEN v_mes_inicio AND v_mes_fim
        ORDER BY s.conta_id, s.data_referencia DESC
    LOOP
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, saldo_caixa_outros, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, 'XP', p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, COALESCE(v_rec.saldo_coe,0), p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, sub_tipo, conglomerado_id, asset_class, taxa_formatada, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.nome, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            c.taxa_canonica, COALESCE(c.benchmark_canonico, p.benchmark),
            COALESCE(c.sub_tipo_canonico, p.sub_tipo), c.conglomerado_id, p.asset_class, c.taxa_formatada,
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
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, saldo_caixa_outros, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, 'AVENUE', p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, 0, p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, sub_tipo, conglomerado_id, asset_class, taxa_formatada, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.nome),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.maturity_date),
            c.taxa_canonica, c.benchmark_canonico,
            COALESCE(c.sub_tipo_canonico, p.sub_tipo), c.conglomerado_id, p.asset_class, c.taxa_formatada,
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
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, saldo_caixa_outros, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, 'AGORA', p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, 0, p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, sub_tipo, conglomerado_id, asset_class, taxa_formatada, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            COALESCE(c.taxa_canonica, p.taxa), c.benchmark_canonico,
            COALESCE(c.sub_tipo_canonico, p.sub_tipo), c.conglomerado_id, p.asset_class, c.taxa_formatada,
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
        INSERT INTO snapshots_fechados (cliente_id, conta_id, instituicao, mes_referencia, data_referencia, snapshot_origem_id, patrimonio_total, saldo_caixa_outros, frozen_by, auto_fechado)
        VALUES (p_cliente_id, v_rec.conta_id, v_rec.instituicao, p_mes_referencia, v_rec.data_referencia, v_rec.id, v_rec.patrimonio_total, 0, p_consultor_id, p_auto)
        RETURNING id INTO v_fechado_id;

        INSERT INTO posicoes_fechadas (snapshot_fechado_id, conta_id, ativo_canonico_id, nome_exibicao, classe_avere, liquidez_avere, emissor_id, emissor_nome, data_vencimento, taxa, benchmark, sub_tipo, conglomerado_id, asset_class, taxa_formatada, valor_bruto, valor_liquido, quantidade, preco_mercado, instituicao, codigo_identificador_origem, tipo_identificador_origem)
        SELECT v_fechado_id, v_rec.conta_id, p.ativo_canonico_id,
            COALESCE(NULLIF(e_cli.apelido_ativo,''), NULLIF(e_glo.apelido_ativo,''), c.nome_canonico, p.emissor),
            COALESCE(e_cli.classe_customizada, e_glo.classe_customizada, c.classe_avere),
            COALESCE(e_cli.liquidez_customizada, e_glo.liquidez_customizada, c.liquidez_avere),
            COALESCE(e_cli.emissor_customizado_id, e_glo.emissor_customizado_id, c.emissor_id),
            em.nome_fantasia,
            COALESCE(e_cli.vencimento_customizado, e_glo.vencimento_customizado, c.data_vencimento, p.data_vencimento),
            COALESCE(c.taxa_canonica, p.rentabilidade), COALESCE(c.benchmark_canonico, p.benchmark),
            COALESCE(c.sub_tipo_canonico, p.sub_tipo), c.conglomerado_id, p.asset_class, c.taxa_formatada,
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
