-- ═══════════════════════════════════════════════════════════════════════════
-- biblioteca_ativos — permissão de escrita pela curadoria do Master (front).
-- A tabela nasceu só com SELECT → o upsert do drawer (sessão authenticated)
-- batia 403. A semeadura da API roda como service_role e não era afetada.
-- Espelha o que o ativos_canonicos já permite (curadoria pelo Master via UI).
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_insert_biblioteca_ativos" ON biblioteca_ativos;
CREATE POLICY "auth_insert_biblioteca_ativos" ON biblioteca_ativos
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_biblioteca_ativos" ON biblioteca_ativos;
CREATE POLICY "auth_update_biblioteca_ativos" ON biblioteca_ativos
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
