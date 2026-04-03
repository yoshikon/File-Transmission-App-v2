/*
  # Add Email Rate Limiting Table

  ## Overview
  Adds a rate limiting mechanism for the send-email Edge Function to prevent
  abuse and spam. Tracks email send counts per user within configurable time windows.

  ## New Tables
  - `email_rate_limits`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `window_start` (timestamptz) - start of the current rate limit window
    - `send_count` (int) - number of emails sent in this window
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only the service role can insert/update (used exclusively by Edge Functions)
  - Users can read their own rate limit data

  ## Rate Limit Config
  - Default: 100 emails per hour per user
  - Window: 1 hour rolling window
*/

CREATE TABLE IF NOT EXISTS email_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  send_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_rate_limits_user_window_idx
  ON email_rate_limits (user_id, window_start);

CREATE INDEX IF NOT EXISTS email_rate_limits_user_id_idx
  ON email_rate_limits (user_id);

ALTER TABLE email_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own rate limit data"
  ON email_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
