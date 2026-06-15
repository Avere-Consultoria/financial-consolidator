-- ═══════════════════════════════════════════════════════════════════════════
-- Sincronização agendada (automática)
--
-- Arquitetura:
--   • sync_config — singleton editável pela UI (liga/desliga, janela, lote,
--     instituições). O cron lê isso a cada tique e decide se age.
--   • sync_log — auditoria de cada execução (cron ou manual).
--   • cron_tick_sync() — roda a cada 5 min (pg_cron); se dentro da janela e
--     habilitado, dispara (pg_net) a edge function `sync-agendado` UMA vez.
--     A edge function processa um LOTE de contas pendentes por chamada (evita
--     o timeout de ~150s ao tentar todas de uma vez); o próximo tique pega o
--     resto, até esvaziar a fila do dia.
--
-- Pré-requisito manual (segredo NUNCA versionado):
--   SELECT vault.create_secret('<MESMO CRON_SECRET das functions>', 'cron_secret');
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Config (1 linha; editável só pelo master) ────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_config (
    id                int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    habilitado        boolean NOT NULL DEFAULT false,
    hora_inicio       int     NOT NULL DEFAULT 6  CHECK (hora_inicio BETWEEN 0 AND 23),
    hora_fim          int     NOT NULL DEFAULT 9  CHECK (hora_fim    BETWEEN 1 AND 24),
    somente_dia_util  boolean NOT NULL DEFAULT true,
    instituicoes      text[]  NOT NULL DEFAULT ARRAY['BTG','AVENUE','AGORA'],  -- XP fora até o certificado
    tamanho_lote      int     NOT NULL DEFAULT 25 CHECK (tamanho_lote BETWEEN 1 AND 200),
    atualizado_em     timestamptz NOT NULL DEFAULT now()
);
INSERT INTO sync_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Log de execuções ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    iniciado_em    timestamptz NOT NULL DEFAULT now(),
    finalizado_em  timestamptz,
    origem         text NOT NULL DEFAULT 'cron',     -- cron | manual
    total          int  NOT NULL DEFAULT 0,
    ok             int  NOT NULL DEFAULT 0,
    erro           int  NOT NULL DEFAULT 0,
    detalhe        jsonb
);
CREATE INDEX IF NOT EXISTS idx_sync_log_iniciado ON sync_log (iniciado_em DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE sync_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_sel_cfg ON sync_config;
DROP POLICY IF EXISTS p_wr_cfg  ON sync_config;
CREATE POLICY p_sel_cfg ON sync_config FOR SELECT TO authenticated USING (true);
CREATE POLICY p_wr_cfg  ON sync_config FOR ALL    TO authenticated
    USING (public.is_master()) WITH CHECK (public.is_master());

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_sel_log ON sync_log;
CREATE POLICY p_sel_log ON sync_log FOR SELECT TO authenticated USING (true);
-- escrita só por service_role (edge function) — sem policy de INSERT p/ authenticated

-- ── Tick do cron: gate de janela + dispara a edge function uma vez ───────────
CREATE OR REPLACE FUNCTION public.cron_tick_sync()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, net AS $$
DECLARE
    cfg      sync_config%ROWTYPE;
    agora_sp timestamptz := now();
    h        int;
    dow      int;
    v_secret text;
    v_url    text := 'https://dhiqbfldihyjbrgbfveq.supabase.co/functions/v1/sync-agendado';
BEGIN
    SELECT * INTO cfg FROM sync_config WHERE id = 1;
    IF cfg.id IS NULL OR NOT cfg.habilitado THEN RETURN; END IF;

    h   := EXTRACT(hour FROM agora_sp AT TIME ZONE 'America/Sao_Paulo');
    dow := EXTRACT(dow  FROM agora_sp AT TIME ZONE 'America/Sao_Paulo');  -- 0=dom .. 6=sáb
    IF cfg.somente_dia_util AND dow IN (0, 6) THEN RETURN; END IF;
    IF h < cfg.hora_inicio OR h >= cfg.hora_fim THEN RETURN; END IF;

    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';
    IF v_secret IS NULL THEN RETURN; END IF;   -- segredo não provisionado → não dispara

    PERFORM net.http_post(
        url     := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
        body    := jsonb_build_object('origem', 'cron')
    );
END $$;

-- ── Agendamento: a cada 5 minutos (o gate de janela mora na função) ──────────
DO $$ BEGIN
    PERFORM cron.unschedule('sync-agendado-tick');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('sync-agendado-tick', '*/5 * * * *', $$SELECT public.cron_tick_sync()$$);
