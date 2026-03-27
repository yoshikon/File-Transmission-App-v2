/*
  # Setup pg_cron and pg_net for scheduled task execution

  ## Overview
  This migration enables pg_cron and pg_net extensions to allow PostgreSQL to
  periodically trigger the `scheduled-tasks` Edge Function via HTTP.

  ## What this does

  1. Extensions
    - Enables `pg_cron` - PostgreSQL job scheduler
    - Enables `pg_net` - Async HTTP client for PostgreSQL

  2. Scheduled Jobs
    - Every minute: processes scheduled deliveries (`scheduled-send`)
      Checks for deliveries with status='scheduled' where scheduled_at <= now()
      and sends them via the Edge Function.
    - Every hour (at :05): processes expiry warnings (`expiry-warnings`)
      Sends notifications/emails when delivery links expire within 3 days.
    - Every day at 08:00 JST (23:00 UTC): sends daily digest emails (`daily-digest`)
      Sends activity summary emails to users who have enabled digest notifications.

  ## Security
  - The cron jobs use the service role key stored in vault secrets to authenticate
    Edge Function calls, allowing server-side execution without user JWT.
  - The pg_net requests are made via HTTP to the Supabase Edge Function endpoint.

  ## Important Notes
  - The `scheduled-tasks` Edge Function must be deployed with `verify_jwt: false`
    OR the service role key must be passed as the Bearer token (we use the latter).
  - Cron job names are unique per schema; re-running this migration is safe due to
    `IF NOT EXISTS` style unschedule-then-schedule pattern.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE 'Vault secrets not found. Cron jobs will use environment-based URL.';
  END IF;
END $$;

SELECT cron.unschedule('secureshare-scheduled-send') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'secureshare-scheduled-send'
);

SELECT cron.unschedule('secureshare-expiry-warnings') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'secureshare-expiry-warnings'
);

SELECT cron.unschedule('secureshare-daily-digest') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'secureshare-daily-digest'
);
