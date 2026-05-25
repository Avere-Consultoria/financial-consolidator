-- ═══════════════════════════════════════════════════════════════════════════
-- Fix F4 — adiciona is_month_end em posicao_agora_snapshots
--
-- Outros snapshots (BTG/XP/Avenue) já tinham essa coluna desde o schema
-- original; só Ágora ficou faltando. A função fechar_mes precisa dela
-- para marcar o snapshot vivo como "fim de mês".
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE posicao_agora_snapshots
    ADD COLUMN IF NOT EXISTS is_month_end boolean NOT NULL DEFAULT false;
