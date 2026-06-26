-- ═══════════════════════════════════════════════════════════════════════════
-- Unicidade de perfil_id em consultores: UM login = UM consultor.
--
-- O RLS (consultores.perfil_id = auth.uid()) e o get_consultor_id()
-- (SELECT id FROM consultores WHERE perfil_id = auth.uid() LIMIT 1) assumem
-- essa relação 1:1. Sem o índice, dois consultores poderiam apontar para o
-- mesmo login e o acesso resolveria para o consultor ERRADO (vazamento entre
-- carteiras). Fecha esse furo na origem.
--
-- Parcial (WHERE perfil_id IS NOT NULL): consultores ainda não provisionados
-- (sem acesso) têm perfil_id NULL e não conflitam entre si.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS uq_consultores_perfil_id
    ON consultores (perfil_id) WHERE perfil_id IS NOT NULL;
