/*
  # Create cron jobs to trigger scheduled-tasks Edge Function

  ## Overview
  Creates a helper function and cron jobs that periodically call the
  `scheduled-tasks` Edge Function via HTTP using pg_net.

  ## Cron Jobs
  1. `secureshare-scheduled-send` - runs every minute
     Processes deliveries with status='scheduled' where scheduled_at <= now()
  2. `secureshare-expiry-warnings` - runs every hour at :05
     Notifies senders when their delivery links expire within 3 days
  3. `secureshare-daily-digest` - runs daily at 23:00 UTC (08:00 JST)
     Sends daily activity summary emails to opted-in users

  ## Security
  - Uses service_role header for authenticated Edge Function access
  - HTTP calls are async via pg_net; failures are logged in net._http_response
*/

CREATE OR REPLACE FUNCTION call_scheduled_tasks(task text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text := 'https://ihcerkyvpjnnszpqaino.supabase.co/functions/v1/scheduled-tasks?task=' || task;
  v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE NOTICE 'service_role_key not found in vault; skipping %', task;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'secureshare-scheduled-send',
  '* * * * *',
  $$SELECT call_scheduled_tasks('scheduled-send');$$
);

SELECT cron.schedule(
  'secureshare-expiry-warnings',
  '5 * * * *',
  $$SELECT call_scheduled_tasks('expiry-warnings');$$
);

SELECT cron.schedule(
  'secureshare-daily-digest',
  '0 23 * * *',
  $$SELECT call_scheduled_tasks('daily-digest');$$
);
