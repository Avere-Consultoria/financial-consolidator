-- ═══════════════════════════════════════════════════════════════════════════
-- SEGURANÇA — Fase 1: isolamento real por consultor/cliente (RLS).
--
-- PROBLEMA (auditado em pg_policies):
--   • posicao_btg_*/xp_* tinham política `service_role_all` com roles {public}
--     → qualquer um com a anon key lia/escrevia TUDO, sem login.
--   • clientes tinha "Leitura pública" {public} true → base de clientes aberta.
--   • Demais dados de cliente: authenticated + USING(true) → zero isolamento.
--   • Escrita nas tabelas de inteligência liberada a qualquer autenticado.
--
-- SOLUÇÃO:
--   • Helpers is_master() e pode_ver_cliente() (SECURITY DEFINER p/ evitar
--     recursão de RLS).
--   • Dados de cliente: leitura só se dono (consultor) ou master.
--   • Inteligência: leitura p/ autenticados, escrita só master (exceto
--     liquidez_subtipo/excecoes, onde o consultor edita as PRÓPRIAS linhas).
--   • Escrita de posições/fechados continua via service_role/RPC (furam RLS),
--     então o sync e o fechamento NÃO quebram.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Helpers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'MASTER');
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_cliente(p_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM clientes c
        WHERE c.id = p_cliente_id
          AND (c.consultor_id = auth.uid() OR public.is_master())
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_ver_cliente(uuid) TO authenticated;

-- ── 1. clientes — remove as políticas públicas (mantém master + consultor) ────
DROP POLICY IF EXISTS "Leitura pública de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir leitura de clientes para usuários autenticados" ON clientes;

-- ── 2. consultores — leitura do próprio registro (master já tem ALL) ──────────
-- consultores.perfil_id = perfis.id (= auth.uid()); consultores.id é PK própria.
DROP POLICY IF EXISTS consultores_self_read ON consultores;
CREATE POLICY consultores_self_read ON consultores FOR SELECT TO authenticated
    USING (perfil_id = auth.uid() OR public.is_master());

-- ── 3. Posições BTG (dono/master) ─────────────────────────────────────────────
DROP POLICY IF EXISTS service_role_all ON posicao_btg_snapshots;
DROP POLICY IF EXISTS service_role_all ON posicao_btg_ativos;
DROP POLICY IF EXISTS service_role_all ON posicao_btg_aquisicoes;
DROP POLICY IF EXISTS service_role_all ON posicao_btg_janelas_liquidez;

CREATE POLICY p_sel ON posicao_btg_snapshots FOR SELECT TO authenticated
    USING (public.pode_ver_cliente(cliente_id));
CREATE POLICY p_sel ON posicao_btg_ativos FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM posicao_btg_snapshots s WHERE s.id = snapshot_id AND public.pode_ver_cliente(s.cliente_id)));
CREATE POLICY p_sel ON posicao_btg_aquisicoes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM posicao_btg_ativos a JOIN posicao_btg_snapshots s ON s.id = a.snapshot_id WHERE a.id = ativo_id AND public.pode_ver_cliente(s.cliente_id)));
CREATE POLICY p_sel ON posicao_btg_janelas_liquidez FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM posicao_btg_ativos a JOIN posicao_btg_snapshots s ON s.id = a.snapshot_id WHERE a.id = ativo_id AND public.pode_ver_cliente(s.cliente_id)));

-- ── 4. Posições XP ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS service_role_all ON posicao_xp_snapshots;
DROP POLICY IF EXISTS service_role_all ON posicao_xp_ativos;

CREATE POLICY p_sel ON posicao_xp_snapshots FOR SELECT TO authenticated
    USING (public.pode_ver_cliente(cliente_id));
CREATE POLICY p_sel ON posicao_xp_ativos FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM posicao_xp_snapshots s WHERE s.id = snapshot_id AND public.pode_ver_cliente(s.cliente_id)));

-- ── 5. Posições Avenue ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Permitir leitura de snapshots para usuários autenticados" ON posicao_avenue_snapshots;
DROP POLICY IF EXISTS "Permitir leitura de ativos para usuários autenticados" ON posicao_avenue_ativos;

CREATE POLICY p_sel ON posicao_avenue_snapshots FOR SELECT TO authenticated
    USING (public.pode_ver_cliente(cliente_id));
CREATE POLICY p_sel ON posicao_avenue_ativos FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM posicao_avenue_snapshots s WHERE s.id = snapshot_id AND public.pode_ver_cliente(s.cliente_id)));

-- ── 6. Posições Ágora ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Permitir leitura de snapshots agora" ON posicao_agora_snapshots;
DROP POLICY IF EXISTS "Permitir leitura de ativos agora" ON posicao_agora_ativos;
DROP POLICY IF EXISTS allow_authenticated_all ON posicao_agora_aquisicoes;

CREATE POLICY p_sel ON posicao_agora_snapshots FOR SELECT TO authenticated
    USING (public.pode_ver_cliente(cliente_id));
CREATE POLICY p_sel ON posicao_agora_ativos FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM posicao_agora_snapshots s WHERE s.id = snapshot_id AND public.pode_ver_cliente(s.cliente_id)));
CREATE POLICY p_sel ON posicao_agora_aquisicoes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM posicao_agora_ativos a JOIN posicao_agora_snapshots s ON s.id = a.snapshot_id WHERE a.id = ativo_id AND public.pode_ver_cliente(s.cliente_id)));

-- ── 7. Posições Manuais ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS auth_read_manual_snap ON posicao_manual_snapshots;
DROP POLICY IF EXISTS auth_write_manual_snap ON posicao_manual_snapshots;
DROP POLICY IF EXISTS auth_read_manual_ativos ON posicao_manual_ativos;
DROP POLICY IF EXISTS auth_write_manual_ativos ON posicao_manual_ativos;

CREATE POLICY p_sel ON posicao_manual_snapshots FOR SELECT TO authenticated
    USING (public.pode_ver_cliente(cliente_id));
CREATE POLICY p_sel ON posicao_manual_ativos FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM posicao_manual_snapshots s WHERE s.id = snapshot_id AND public.pode_ver_cliente(s.cliente_id)));

-- ── 8. Fechamentos ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS allow_authenticated_all ON snapshots_fechados;
DROP POLICY IF EXISTS allow_authenticated_all ON posicoes_fechadas;

CREATE POLICY p_sel ON snapshots_fechados FOR SELECT TO authenticated
    USING (public.pode_ver_cliente(cliente_id));
CREATE POLICY p_sel ON posicoes_fechadas FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM snapshots_fechados sf WHERE sf.id = snapshot_fechado_id AND public.pode_ver_cliente(sf.cliente_id)));

-- ── 9. cliente_contas (leitura dono/master; escrita master) ───────────────────
DROP POLICY IF EXISTS auth_read_cc ON cliente_contas;
DROP POLICY IF EXISTS auth_write_cc ON cliente_contas;

CREATE POLICY p_sel ON cliente_contas FOR SELECT TO authenticated
    USING (public.pode_ver_cliente(cliente_id));
CREATE POLICY p_wr_master ON cliente_contas FOR ALL TO authenticated
    USING (public.is_master()) WITH CHECK (public.is_master());

-- ── 10. excecoes_classificacao (consultor edita as próprias; master tudo) ─────
DROP POLICY IF EXISTS excecoes_classificacao_auth ON excecoes_classificacao;

CREATE POLICY p_sel ON excecoes_classificacao FOR SELECT TO authenticated
    USING (consultor_id = auth.uid() OR public.is_master());
CREATE POLICY p_wr ON excecoes_classificacao FOR ALL TO authenticated
    USING (consultor_id = auth.uid() OR public.is_master())
    WITH CHECK (consultor_id = auth.uid() OR public.is_master());

-- ── 11. carteiras_personalizadas (dono do cliente) ───────────────────────────
DROP POLICY IF EXISTS carteiras_auth ON carteiras_personalizadas;

CREATE POLICY p_all ON carteiras_personalizadas FOR ALL TO authenticated
    USING (public.pode_ver_cliente(cliente_id))
    WITH CHECK (public.pode_ver_cliente(cliente_id));

-- ── 12. liquidez_subtipo (consultor edita a própria override; master tudo) ────
DROP POLICY IF EXISTS auth_read_liqsub ON liquidez_subtipo;
DROP POLICY IF EXISTS auth_write_liqsub ON liquidez_subtipo;

CREATE POLICY p_sel ON liquidez_subtipo FOR SELECT TO authenticated USING (true);
CREATE POLICY p_wr ON liquidez_subtipo FOR ALL TO authenticated
    USING (public.is_master() OR consultor_id = auth.uid())
    WITH CHECK (public.is_master() OR consultor_id = auth.uid());

-- ── 13. Tabelas de INTELIGÊNCIA — leitura p/ autenticados, escrita só MASTER ──
--    (canônicos, dicionários, instituições, faixas, setores, fontes FGC/BCB)
DO $$
DECLARE t text; p text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'ativos_canonicos','dicionario_ativos','dicionario_classes','dicionario_emissores',
        'dicionario_conglomerados','emissor_aliases','instituicoes','instituicoes_fgc',
        'fgc_sync_log','bcb_instituicoes','bcb_sync_log','setores','faixas_temporais'
    ])
    LOOP
        -- remove todas as políticas atuais da tabela
        FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', p, t);
        END LOOP;
        EXECUTE format('CREATE POLICY p_sel ON %I FOR SELECT TO authenticated USING (true);', t);
        EXECUTE format('CREATE POLICY p_wr_master ON %I FOR ALL TO authenticated USING (public.is_master()) WITH CHECK (public.is_master());', t);
    END LOOP;
END $$;
