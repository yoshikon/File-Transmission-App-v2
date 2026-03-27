/*
  # Update cron jobs to use cron_secret for Edge Function authentication

  ## Overview
  Updates the `call_scheduled_tasks` helper function to use a dedicated
  `cron_secret` stored in Supabase Vault rather than the service_role_key.
  This is more secure and works with the `verify_jwt: false` Edge Function
  deployment where authentication is handled by the function itself.

  ## Changes
  - Recreates `call_scheduled_tasks` function using vault `cron_secret`
  - The `scheduled-tasks` Edge Function validates the `X-Cron-Secret` header
*/

CREATE OR REPLACE FUNCTION call_scheduled_tasks(task text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text := 'https://ihcerkyvpjnnszpqaino.supabase.co/functions/v1/scheduled-tasks?task=' || task;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE NOTICE 'cron_secret not found in vault; skipping scheduled task: %', task;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', v_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;
