/*
  # Add email_logs table for tracking sent emails

  1. New Tables
    - `email_logs`
      - `id` (uuid, primary key) - Unique log entry ID
      - `delivery_id` (uuid, FK -> deliveries) - Associated delivery
      - `delivery_recipient_id` (uuid, FK -> delivery_recipients) - Associated recipient
      - `recipient_email` (text) - Recipient email address
      - `subject` (text) - Email subject line
      - `status` (text) - Email status: pending, sent, failed
      - `error_message` (text, nullable) - Error details if sending failed
      - `resend_id` (text, nullable) - Resend API response ID for tracking
      - `sent_at` (timestamptz, nullable) - When the email was successfully sent
      - `created_at` (timestamptz) - When the log was created

  2. Security
    - Enable RLS on `email_logs` table
    - Senders can read their own email logs via delivery ownership
    - Service role (Edge Functions) can insert logs

  3. Indexes
    - `delivery_id` for fast lookup by delivery
    - `delivery_recipient_id` for fast lookup by recipient
*/

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  delivery_recipient_id uuid NOT NULL REFERENCES delivery_recipients(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  resend_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can view own email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.id = email_logs.delivery_id
      AND deliveries.sender_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_logs_delivery_id ON email_logs(delivery_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_id ON email_logs(delivery_recipient_id);
