-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: isolamento por consultor em CLIENTES (bug pego no teste de ponta a ponta)
--
-- O FK clientes.consultor_id aponta para consultores(id) — o CADASTRO do
-- consultor — mas o RLS da Fase 1 comparava com auth.uid() (o LOGIN/perfil).
-- Os dois nunca casam → consultor logado não via cliente nenhum.
--
-- Semântica oficial a partir daqui:
--   clientes.consultor_id            → consultores.id       (cadastro)
--   consultores.perfil_id            → perfis.id = auth.uid (login)
--   liquidez_subtipo/excecoes.consultor_id → perfis.id      (login — INALTERADO)
--
-- Bônus: com o FK no cadastro, o backfill de vínculos pode rodar para os 326
-- clientes AGORA, sem esperar provisionamento de login — o RLS resolve o
-- login via join em tempo de consulta.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Helper: id do CADASTRO do consultor logado ────────────────────────────
CREATE OR REPLACE FUNCTION public.consultor_atual_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id FROM consultores WHERE perfil_id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.consultor_atual_id() TO authenticated;

-- ── 1. pode_ver_cliente: compara com o cadastro, não com o login ─────────────
-- (todas as policies de posições/snapshots usam esta função — corrige tudo junto)
CREATE OR REPLACE FUNCTION public.pode_ver_cliente(p_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM clientes c
        WHERE c.id = p_cliente_id
          AND (c.consultor_id = public.consultor_atual_id() OR public.is_master())
    );
$$;

-- ── 2. Policies da tabela clientes: zera e recria com a semântica certa ──────
DO $$
DECLARE p text;
BEGIN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clientes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON clientes;', p);
    END LOOP;
END $$;

CREATE POLICY p_sel ON clientes FOR SELECT TO authenticated
    USING (public.is_master() OR consultor_id = public.consultor_atual_id());
CREATE POLICY p_wr_master ON clientes FOR ALL TO authenticated
    USING (public.is_master()) WITH CHECK (public.is_master());

-- ── 3. RPCs do hardening (1b): mesma correção na checagem interna ────────────
CREATE OR REPLACE FUNCTION public.fechar_mes(
    p_cliente_id uuid, p_mes_referencia text, p_consultor_id uuid DEFAULT NULL, p_auto boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT (public.is_master()
            OR EXISTS (SELECT 1 FROM clientes
                       WHERE id = p_cliente_id
                         AND consultor_id = public.consultor_atual_id())) THEN
        RAISE EXCEPTION 'Acesso negado: você não é o consultor responsável por este cliente';
    END IF;
    RETURN public.fechar_mes_impl(p_cliente_id, p_mes_referencia, p_consultor_id, p_auto);
END $$;

CREATE OR REPLACE FUNCTION public.listar_meses_fechamento(p_cliente_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT (public.is_master()
            OR EXISTS (SELECT 1 FROM clientes
                       WHERE id = p_cliente_id
                         AND consultor_id = public.consultor_atual_id())) THEN
        RAISE EXCEPTION 'Acesso negado: você não é o consultor responsável por este cliente';
    END IF;
    RETURN public.listar_meses_fechamento_impl(p_cliente_id);
END $$;

-- ── 4. Verificação (rodar à mão depois) ──────────────────────────────────────
-- SELECT public.consultor_atual_id();              -- logado como consultor: o id do cadastro
-- SELECT count(*) FROM clientes;                   -- consultor: só os dele | master: todos
