-- ═══════════════════════════════════════════════════════════════════════════
-- SEGURANÇA — Lote 1: fecha os 2 CRÍTICOS da revisão.
--
-- 1) perfis: a policy perfis_proprio_usuario é ALL com USING/CHECK (id=auth.uid())
--    e SEM restrição de coluna → um consultor faz UPDATE perfis SET role='MASTER'
--    no próprio id e vira master, anulando todos os is_master() do sistema.
--    RLS não restringe COLUNA, então a trava é um trigger BEFORE UPDATE.
--
-- 2) fundir_ativo_canonico: SECURITY DEFINER (fura RLS), SEM search_path e SEM
--    is_master(), executável por anon/PUBLIC → qualquer um (até sem login) funde
--    e destrói canônicos globais e re-vincula posicoes_fechadas de todos os tenants.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. perfis — trava anti-auto-escalação de role ───────────────────────────
-- Só barra o USUÁRIO COMUM (auth.role()='authenticated') que não é master.
-- service_role (edges/provisionamento) e o admin de auth (signup) passam; o
-- master pode ajustar pelo fluxo próprio. is_master() lê o estado COMMITADO, sem
-- recursão (SELECT não dispara o trigger de UPDATE).
CREATE OR REPLACE FUNCTION public.perfis_bloquear_auto_escalacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND auth.role() = 'authenticated'
       AND NOT public.is_master() THEN
        RAISE EXCEPTION 'Apenas o master pode alterar o papel (role) de um perfil';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_perfis_bloquear_escalacao ON public.perfis;
CREATE TRIGGER trg_perfis_bloquear_escalacao
    BEFORE UPDATE ON public.perfis
    FOR EACH ROW EXECUTE FUNCTION public.perfis_bloquear_auto_escalacao();

-- ── 2. fundir_ativo_canonico — gate is_master + search_path + superfície ─────
-- Recriada idêntica + SET search_path=public + checagem is_master() no topo.
CREATE OR REPLACE FUNCTION fundir_ativo_canonico(
    p_origem_id  uuid,
    p_destino_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dic_excluidas      int;
    v_dic_movidas        int;
    v_btg_movidas        int;
    v_xp_movidas         int;
    v_avenue_movidas     int;
    v_agora_movidas      int;
    v_excecoes_excluidas int;
    v_excecoes_movidas   int;
    v_fechadas_movidas   int;
BEGIN
    -- Exceção AUTORIZADA à RLS → exige master (ação destrutiva global).
    IF NOT public.is_master() THEN
        RAISE EXCEPTION 'Apenas o master pode fundir ativos canônicos';
    END IF;

    -- ── Validações ────────────────────────────────────────────────────────
    IF p_origem_id IS NULL OR p_destino_id IS NULL THEN
        RAISE EXCEPTION 'origem_id e destino_id são obrigatórios';
    END IF;

    IF p_origem_id = p_destino_id THEN
        RAISE EXCEPTION 'Canônicos origem e destino devem ser diferentes';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ativos_canonicos WHERE id = p_origem_id) THEN
        RAISE EXCEPTION 'Canônico origem não encontrado: %', p_origem_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ativos_canonicos WHERE id = p_destino_id) THEN
        RAISE EXCEPTION 'Canônico destino não encontrado: %', p_destino_id;
    END IF;

    -- ── 1. dicionario_ativos ──────────────────────────────────────────────
    DELETE FROM dicionario_ativos d_o
    WHERE d_o.ativo_canonico_id = p_origem_id
      AND EXISTS (
          SELECT 1 FROM dicionario_ativos d_d
          WHERE d_d.ativo_canonico_id    = p_destino_id
            AND d_d.instituicao_origem    = d_o.instituicao_origem
            AND d_d.codigo_identificador  = d_o.codigo_identificador
            AND d_d.tipo_identificador    = d_o.tipo_identificador
      );
    GET DIAGNOSTICS v_dic_excluidas = ROW_COUNT;

    UPDATE dicionario_ativos
    SET ativo_canonico_id = p_destino_id
    WHERE ativo_canonico_id = p_origem_id;
    GET DIAGNOSTICS v_dic_movidas = ROW_COUNT;

    -- ── 2. posicao_*_ativos ──────────────────────────────────────────────
    UPDATE posicao_btg_ativos    SET ativo_canonico_id = p_destino_id WHERE ativo_canonico_id = p_origem_id;
    GET DIAGNOSTICS v_btg_movidas = ROW_COUNT;

    UPDATE posicao_xp_ativos     SET ativo_canonico_id = p_destino_id WHERE ativo_canonico_id = p_origem_id;
    GET DIAGNOSTICS v_xp_movidas = ROW_COUNT;

    UPDATE posicao_avenue_ativos SET ativo_canonico_id = p_destino_id WHERE ativo_canonico_id = p_origem_id;
    GET DIAGNOSTICS v_avenue_movidas = ROW_COUNT;

    UPDATE posicao_agora_ativos  SET ativo_canonico_id = p_destino_id WHERE ativo_canonico_id = p_origem_id;
    GET DIAGNOSTICS v_agora_movidas = ROW_COUNT;

    -- ── 3. excecoes_classificacao ────────────────────────────────────────
    DELETE FROM excecoes_classificacao e_o
    WHERE e_o.ativo_canonico_id = p_origem_id
      AND EXISTS (
          SELECT 1 FROM excecoes_classificacao e_d
          WHERE e_d.ativo_canonico_id = p_destino_id
            AND e_d.consultor_id      = e_o.consultor_id
            AND (
                (e_d.cliente_id IS NULL AND e_o.cliente_id IS NULL)
                OR e_d.cliente_id = e_o.cliente_id
            )
      );
    GET DIAGNOSTICS v_excecoes_excluidas = ROW_COUNT;

    UPDATE excecoes_classificacao
    SET ativo_canonico_id = p_destino_id
    WHERE ativo_canonico_id = p_origem_id;
    GET DIAGNOSTICS v_excecoes_movidas = ROW_COUNT;

    -- ── 4. posicoes_fechadas (histórico imutável) ────────────────────────
    UPDATE posicoes_fechadas
    SET ativo_canonico_id = p_destino_id
    WHERE ativo_canonico_id = p_origem_id;
    GET DIAGNOSTICS v_fechadas_movidas = ROW_COUNT;

    -- ── 5. Remove canônico origem ────────────────────────────────────────
    DELETE FROM ativos_canonicos WHERE id = p_origem_id;

    -- ── Resposta ─────────────────────────────────────────────────────────
    RETURN jsonb_build_object(
        'sucesso',              true,
        'dicionario_excluidas', v_dic_excluidas,
        'dicionario_movidas',   v_dic_movidas,
        'posicoes_btg',         v_btg_movidas,
        'posicoes_xp',          v_xp_movidas,
        'posicoes_avenue',      v_avenue_movidas,
        'posicoes_agora',       v_agora_movidas,
        'excecoes_excluidas',   v_excecoes_excluidas,
        'excecoes_movidas',     v_excecoes_movidas,
        'fechadas_movidas',     v_fechadas_movidas
    );
END;
$$;

-- Superfície: tira anon/PUBLIC (o is_master() já barra, isto é defesa extra).
REVOKE ALL ON FUNCTION fundir_ativo_canonico(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fundir_ativo_canonico(uuid, uuid) TO authenticated, service_role;
