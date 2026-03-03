/*
  # Create notification_settings table

  1. New Tables
    - `notification_settings`
      - `id` (uuid, primary key, references profiles.id)
      - `email_on_open` (boolean, default true) - notify when recipient opens portal
      - `email_on_download` (boolean, default true) - notify when recipient downloads
      - `email_on_expiry` (boolean, default true) - warn before link expires
      - `email_digest` (boolean, default false) - daily summary digest
      - `sender_email` (text, default '') - from email address
      - `sender_name` (text, default 'SecureShare') - from display name
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on notification_settings
    - Users can read, insert, and update their own settings only
*/

CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_on_open boolean NOT NULL DEFAULT true,
  email_on_download boolean NOT NULL DEFAULT true,
  email_on_expiry boolean NOT NULL DEFAULT true,
  email_digest boolean NOT NULL DEFAULT false,
  sender_email text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT 'SecureShare',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
