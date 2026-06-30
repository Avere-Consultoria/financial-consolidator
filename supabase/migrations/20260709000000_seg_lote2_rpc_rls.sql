-- ═══════════════════════════════════════════════════════════════════════════
-- SEGURANÇA — Lote 2: fecha 3 HIGH (RPC + RLS).
--
-- A) _impl bypass: a fase1b fez REVOKE ... FROM PUBLIC nas funções _impl, mas o
--    Supabase concede EXECUTE explícito a anon/authenticated (default privileges),
--    que o REVOKE FROM PUBLIC não tira. proacl ao vivo mostra authenticated=X nos
--    _impl → o guard do wrapper é driblável chamando /rpc/<nome>_impl direto.
--    Aqui REVOGAMOS explicitamente de anon/authenticated. O wrapper (SECURITY
--    DEFINER, dono) segue chamando o _impl — a checagem de EXECUTE do _impl é
--    contra o DONO, não contra authenticated, então não quebra nada.
--
-- B) envio_pdf_manual: SELECT USING(true) vaza metadados cross-tenant → restringe
--    a master OU consultor dono do cliente. O import roda como service_role (fura
--    RLS) e não é afetado.
--
-- C) biblioteca_ativos: escrita WITH CHECK(true)/USING(true) deixa qualquer
--    consultor poluir a curadoria global → restringe a is_master() (espelha
--    ativos_canonicos). O write só existe no DrawerCanonico (Master Ativos).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── A) Tranca os _impl (e o cron_tick_sync) para anon/authenticated ──────────
REVOKE ALL ON FUNCTION public.fechar_mes_impl(uuid, text, uuid, boolean)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.listar_meses_fechamento_impl(uuid)              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.listar_manutencao_status_impl(integer)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_fechar_meses_pendentes_impl(integer)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.podar_snapshots_diarios_impl()                  FROM PUBLIC, anon, authenticated;

-- cron_tick_sync só é chamada pelo pg_cron (roda como postgres, dono → não
-- precisa de grant). Tirar de anon/authenticated/PUBLIC é higiene pura.
REVOKE ALL ON FUNCTION public.cron_tick_sync()                                FROM PUBLIC, anon, authenticated;

-- Garante que o service_role (orquestrador) mantém o acesso aos _impl.
GRANT EXECUTE ON FUNCTION public.fechar_mes_impl(uuid, text, uuid, boolean)   TO service_role;
GRANT EXECUTE ON FUNCTION public.listar_meses_fechamento_impl(uuid)           TO service_role;
GRANT EXECUTE ON FUNCTION public.listar_manutencao_status_impl(integer)       TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_fechar_meses_pendentes_impl(integer)    TO service_role;
GRANT EXECUTE ON FUNCTION public.podar_snapshots_diarios_impl()               TO service_role;

-- ── B) envio_pdf_manual — leitura só de quem pode ver o cliente ──────────────
DROP POLICY IF EXISTS auth_read_envio_pdf ON envio_pdf_manual;
CREATE POLICY auth_read_envio_pdf ON envio_pdf_manual
    FOR SELECT TO authenticated
    USING (public.is_master() OR public.pode_ver_cliente(cliente_id));

-- ── C) biblioteca_ativos — escrita só do master (espelha ativos_canonicos) ───
DROP POLICY IF EXISTS "auth_insert_biblioteca_ativos" ON biblioteca_ativos;
CREATE POLICY "auth_insert_biblioteca_ativos" ON biblioteca_ativos
    FOR INSERT TO authenticated WITH CHECK (public.is_master());

DROP POLICY IF EXISTS "auth_update_biblioteca_ativos" ON biblioteca_ativos;
CREATE POLICY "auth_update_biblioteca_ativos" ON biblioteca_ativos
    FOR UPDATE TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());
