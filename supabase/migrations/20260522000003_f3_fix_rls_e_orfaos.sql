-- ═══════════════════════════════════════════════════════════════════════════
-- Fix F3 — RLS policies + limpeza de canônicos órfãos
--
-- Problema 1: ativos_canonicos foi criada com RLS habilitado mas sem
-- policies, bloqueando todas as leituras do front.
--
-- Problema 2: ciclo de truncate manual deixou canônicos órfãos
-- (sem nenhum dicionario_ativos apontando pra eles).
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. Limpa canônicos órfãos (não referenciados por nenhuma linha do dicionário)
-- ───────────────────────────────────────────────────────────────────────────

DELETE FROM ativos_canonicos
WHERE id NOT IN (
    SELECT DISTINCT ativo_canonico_id
    FROM dicionario_ativos
    WHERE ativo_canonico_id IS NOT NULL
);


-- ───────────────────────────────────────────────────────────────────────────
-- 2. Garante RLS habilitado nas tabelas novas + adiciona policies permissivas
--    (mesmo padrão das tabelas pré-existentes do projeto — refinar depois
--    com auth por consultor se quiser segurança fina)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE ativos_canonicos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots_fechados  ENABLE ROW LEVEL SECURITY;
ALTER TABLE posicoes_fechadas   ENABLE ROW LEVEL SECURITY;

-- ── ativos_canonicos ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_authenticated_all" ON ativos_canonicos;
CREATE POLICY "allow_authenticated_all" ON ativos_canonicos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ── snapshots_fechados ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_authenticated_all" ON snapshots_fechados;
CREATE POLICY "allow_authenticated_all" ON snapshots_fechados
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ── posicoes_fechadas ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_authenticated_all" ON posicoes_fechadas;
CREATE POLICY "allow_authenticated_all" ON posicoes_fechadas
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- Validação:
--
--   SELECT COUNT(*) FROM ativos_canonicos;   -- deve ser = 40 (sem órfãos)
--
--   SELECT tablename, policyname, cmd
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('ativos_canonicos','snapshots_fechados','posicoes_fechadas')
--   ORDER BY tablename;
--   -- deve mostrar 1 policy por tabela
-- ═══════════════════════════════════════════════════════════════════════════
