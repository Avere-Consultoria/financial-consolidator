-- ═══════════════════════════════════════════════════════════════════════════
-- SEGURANÇA — Fase 1b: hardening das RPCs SECURITY DEFINER.
--
-- As funções rodam como dono (furam RLS) e eram chamáveis direto por qualquer
-- autenticado, sem checar quem chama. Aqui, para cada uma:
--   1. renomeia a implementação para <nome>_impl (idempotente via to_regprocedure);
--   2. fixa search_path = public na impl (anti-hijack);
--   3. cria um WRAPPER <nome> que valida autorização e chama a impl;
--   4. trava grants: impl só p/ service_role; wrapper p/ authenticated.
--
-- Regras de autz:
--   • fechar_mes / listar_meses_fechamento → master OU consultor dono do cliente.
--   • listar_manutencao_status / auto_fechar_meses_pendentes / podar_snapshots_diarios
--     → somente master (operações globais).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── fechar_mes(uuid, text, uuid, boolean) — dono/master ──────────────────────
DO $$ BEGIN
    IF to_regprocedure('public.fechar_mes(uuid,text,uuid,boolean)') IS NOT NULL
       AND to_regprocedure('public.fechar_mes_impl(uuid,text,uuid,boolean)') IS NULL THEN
        ALTER FUNCTION public.fechar_mes(uuid,text,uuid,boolean) RENAME TO fechar_mes_impl;
    END IF;
END $$;
ALTER FUNCTION public.fechar_mes_impl(uuid,text,uuid,boolean) SET search_path = public;

CREATE OR REPLACE FUNCTION public.fechar_mes(
    p_cliente_id uuid, p_mes_referencia text, p_consultor_id uuid DEFAULT NULL, p_auto boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT (public.is_master()
            OR EXISTS (SELECT 1 FROM clientes WHERE id = p_cliente_id AND consultor_id = auth.uid())) THEN
        RAISE EXCEPTION 'Acesso negado: você não é o consultor responsável por este cliente';
    END IF;
    RETURN public.fechar_mes_impl(p_cliente_id, p_mes_referencia, p_consultor_id, p_auto);
END $$;

REVOKE ALL ON FUNCTION public.fechar_mes_impl(uuid,text,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fechar_mes_impl(uuid,text,uuid,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.fechar_mes(uuid,text,uuid,boolean) TO authenticated, service_role;

-- ── listar_meses_fechamento(uuid) — dono/master ──────────────────────────────
DO $$ BEGIN
    IF to_regprocedure('public.listar_meses_fechamento(uuid)') IS NOT NULL
       AND to_regprocedure('public.listar_meses_fechamento_impl(uuid)') IS NULL THEN
        ALTER FUNCTION public.listar_meses_fechamento(uuid) RENAME TO listar_meses_fechamento_impl;
    END IF;
END $$;
ALTER FUNCTION public.listar_meses_fechamento_impl(uuid) SET search_path = public;

CREATE OR REPLACE FUNCTION public.listar_meses_fechamento(p_cliente_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT (public.is_master()
            OR EXISTS (SELECT 1 FROM clientes WHERE id = p_cliente_id AND consultor_id = auth.uid())) THEN
        RAISE EXCEPTION 'Acesso negado: você não é o consultor responsável por este cliente';
    END IF;
    RETURN public.listar_meses_fechamento_impl(p_cliente_id);
END $$;

REVOKE ALL ON FUNCTION public.listar_meses_fechamento_impl(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_meses_fechamento_impl(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.listar_meses_fechamento(uuid) TO authenticated, service_role;

-- ── listar_manutencao_status(int) — somente master ──────────────────────────
DO $$ BEGIN
    IF to_regprocedure('public.listar_manutencao_status(int)') IS NOT NULL
       AND to_regprocedure('public.listar_manutencao_status_impl(int)') IS NULL THEN
        ALTER FUNCTION public.listar_manutencao_status(int) RENAME TO listar_manutencao_status_impl;
    END IF;
END $$;
ALTER FUNCTION public.listar_manutencao_status_impl(int) SET search_path = public;

CREATE OR REPLACE FUNCTION public.listar_manutencao_status(p_dias_buffer int DEFAULT 15)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_master() THEN
        RAISE EXCEPTION 'Acesso negado: apenas master pode acessar a manutenção';
    END IF;
    RETURN public.listar_manutencao_status_impl(p_dias_buffer);
END $$;

REVOKE ALL ON FUNCTION public.listar_manutencao_status_impl(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_manutencao_status_impl(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.listar_manutencao_status(int) TO authenticated, service_role;

-- ── auto_fechar_meses_pendentes(int) — somente master ───────────────────────
DO $$ BEGIN
    IF to_regprocedure('public.auto_fechar_meses_pendentes(int)') IS NOT NULL
       AND to_regprocedure('public.auto_fechar_meses_pendentes_impl(int)') IS NULL THEN
        ALTER FUNCTION public.auto_fechar_meses_pendentes(int) RENAME TO auto_fechar_meses_pendentes_impl;
    END IF;
END $$;
ALTER FUNCTION public.auto_fechar_meses_pendentes_impl(int) SET search_path = public;

CREATE OR REPLACE FUNCTION public.auto_fechar_meses_pendentes(p_dias_buffer int DEFAULT 15)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_master() THEN
        RAISE EXCEPTION 'Acesso negado: apenas master pode executar o auto-fechamento';
    END IF;
    RETURN public.auto_fechar_meses_pendentes_impl(p_dias_buffer);
END $$;

REVOKE ALL ON FUNCTION public.auto_fechar_meses_pendentes_impl(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_fechar_meses_pendentes_impl(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_fechar_meses_pendentes(int) TO authenticated, service_role;

-- ── podar_snapshots_diarios() — somente master ──────────────────────────────
DO $$ BEGIN
    IF to_regprocedure('public.podar_snapshots_diarios()') IS NOT NULL
       AND to_regprocedure('public.podar_snapshots_diarios_impl()') IS NULL THEN
        ALTER FUNCTION public.podar_snapshots_diarios() RENAME TO podar_snapshots_diarios_impl;
    END IF;
END $$;
ALTER FUNCTION public.podar_snapshots_diarios_impl() SET search_path = public;

CREATE OR REPLACE FUNCTION public.podar_snapshots_diarios()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_master() THEN
        RAISE EXCEPTION 'Acesso negado: apenas master pode podar snapshots';
    END IF;
    RETURN public.podar_snapshots_diarios_impl();
END $$;

REVOKE ALL ON FUNCTION public.podar_snapshots_diarios_impl() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.podar_snapshots_diarios_impl() TO service_role;
GRANT EXECUTE ON FUNCTION public.podar_snapshots_diarios() TO authenticated, service_role;
