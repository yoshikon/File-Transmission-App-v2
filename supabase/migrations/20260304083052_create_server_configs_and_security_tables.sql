/*
  # Create server_configs, ip_restrictions tables

  1. New Tables
    - `server_configs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to profiles)
      - `name` (text) - display name for the server
      - `protocol` (text) - SMB, SFTP, FTP, NFS
      - `host` (text) - hostname or IP
      - `port` (text) - port number
      - `username` (text) - connection username
      - `status` (text) - connected, disconnected, testing
      - `last_tested_at` (timestamptz) - when connection was last tested
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `ip_restrictions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to profiles)
      - `ip_address` (text) - CIDR or exact IP
      - `label` (text) - description label
      - `enabled` (boolean) - whether this rule is active
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only manage their own data
*/

CREATE TABLE IF NOT EXISTS server_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  protocol text NOT NULL DEFAULT 'SMB',
  host text NOT NULL DEFAULT '',
  port text NOT NULL DEFAULT '445',
  username text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'disconnected',
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT server_configs_status_check CHECK (status = ANY (ARRAY['connected', 'disconnected', 'testing']))
);

ALTER TABLE server_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own server configs"
  ON server_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own server configs"
  ON server_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own server configs"
  ON server_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own server configs"
  ON server_configs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ip_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ip_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own IP restrictions"
  ON ip_restrictions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own IP restrictions"
  ON ip_restrictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own IP restrictions"
  ON ip_restrictions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own IP restrictions"
  ON ip_restrictions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
