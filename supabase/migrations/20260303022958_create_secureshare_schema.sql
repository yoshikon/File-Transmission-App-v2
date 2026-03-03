/*
  # SecureShare - Initial Schema

  1. New Tables
    - `profiles` - User profiles for senders (linked to auth.users)
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (text: super_admin, sender)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamptz)
    - `recipients` - Recipient accounts
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text, nullable)
      - `registered` (boolean)
      - `created_at` (timestamptz)
    - `contacts` - Address book entries
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `email` (text)
      - `company` (text, nullable)
      - `tags` (text[], default '{}')
      - `created_at` (timestamptz)
    - `email_templates` - Email templates
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `subject` (text)
      - `body` (text)
      - `is_shared` (boolean, default false)
      - `created_at` (timestamptz)
    - `signatures` - Email signatures
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `content_html` (text)
      - `created_at` (timestamptz)
    - `deliveries` - File delivery jobs
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `subject` (text)
      - `message` (text)
      - `expires_at` (timestamptz)
      - `download_limit` (int, nullable)
      - `password_protected` (boolean, default false)
      - `password_hash` (text, nullable)
      - `notify_on_open` (boolean, default true)
      - `notify_on_download` (boolean, default true)
      - `scheduled_at` (timestamptz, nullable)
      - `status` (text: draft, sent, expired, revoked)
      - `created_at` (timestamptz)
    - `delivery_files` - Files attached to deliveries
      - `id` (uuid, primary key)
      - `delivery_id` (uuid, references deliveries)
      - `file_name` (text)
      - `file_path` (text)
      - `file_size` (bigint)
      - `mime_type` (text, nullable)
      - `storage_path` (text, nullable)
      - `created_at` (timestamptz)
    - `delivery_recipients` - Recipients per delivery
      - `id` (uuid, primary key)
      - `delivery_id` (uuid, references deliveries)
      - `recipient_email` (text)
      - `recipient_type` (text: to, cc, bcc)
      - `token` (text, unique)
      - `download_count` (int, default 0)
      - `first_accessed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
    - `download_logs` - Download activity logs
      - `id` (uuid, primary key)
      - `delivery_recipient_id` (uuid, references delivery_recipients)
      - `file_id` (uuid, references delivery_files)
      - `downloaded_at` (timestamptz)
      - `ip_address` (text, nullable)
      - `user_agent` (text, nullable)
    - `audit_logs` - System audit trail
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable)
      - `action` (text)
      - `resource` (text)
      - `details` (jsonb, nullable)
      - `ip_address` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Profiles: users can read/update own profile, super_admin can read all
    - Contacts: users can CRUD own contacts
    - Email templates: users can CRUD own templates, read shared ones
    - Deliveries: users can CRUD own deliveries, super_admin can read all
    - Delivery files/recipients: access through delivery ownership
    - Download logs: access through delivery ownership
    - Audit logs: only super_admin can read

  3. Indexes
    - delivery_recipients.token (unique, for fast token lookups)
    - deliveries.sender_id (for sender's delivery list)
    - contacts.user_id (for user's contact list)
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'sender' CHECK (role IN ('super_admin', 'sender')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Recipients table
CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text,
  registered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read recipients"
  ON recipients FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert recipients"
  ON recipients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update recipients"
  ON recipients FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  company text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read shared templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (is_shared = true);

CREATE POLICY "Users can insert own templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Signatures table
CREATE TABLE IF NOT EXISTS signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  content_html text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own signatures"
  ON signatures FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signatures"
  ON signatures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signatures"
  ON signatures FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own signatures"
  ON signatures FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL,
  download_limit int,
  password_protected boolean NOT NULL DEFAULT false,
  password_hash text,
  notify_on_open boolean NOT NULL DEFAULT true,
  notify_on_download boolean NOT NULL DEFAULT true,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'expired', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Super admins can read all deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Users can insert own deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete own deliveries"
  ON deliveries FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Delivery files table
CREATE TABLE IF NOT EXISTS delivery_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE delivery_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read files of own deliveries"
  ON delivery_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d WHERE d.id = delivery_id AND d.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert files to own deliveries"
  ON delivery_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d WHERE d.id = delivery_id AND d.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete files from own deliveries"
  ON delivery_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d WHERE d.id = delivery_id AND d.sender_id = auth.uid()
    )
  );

-- Delivery recipients table
CREATE TABLE IF NOT EXISTS delivery_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'to' CHECK (recipient_type IN ('to', 'cc', 'bcc')),
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  download_count int NOT NULL DEFAULT 0,
  first_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE delivery_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read recipients of own deliveries"
  ON delivery_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d WHERE d.id = delivery_id AND d.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recipients to own deliveries"
  ON delivery_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d WHERE d.id = delivery_id AND d.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipients from own deliveries"
  ON delivery_recipients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d WHERE d.id = delivery_id AND d.sender_id = auth.uid()
    )
  );

-- Download logs table
CREATE TABLE IF NOT EXISTS download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_recipient_id uuid NOT NULL REFERENCES delivery_recipients(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES delivery_files(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read download logs of own deliveries"
  ON download_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_recipients dr
      JOIN deliveries d ON d.id = dr.delivery_id
      WHERE dr.id = delivery_recipient_id AND d.sender_id = auth.uid()
    )
  );

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource text NOT NULL DEFAULT '',
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_sender_id ON deliveries(sender_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_recipients_token ON delivery_recipients(token);
CREATE INDEX IF NOT EXISTS idx_delivery_recipients_delivery_id ON delivery_recipients(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_files_delivery_id ON delivery_files(delivery_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_delivery_recipient_id ON download_logs(delivery_recipient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'sender')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;
