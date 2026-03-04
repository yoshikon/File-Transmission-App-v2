/*
  # Create notifications table

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id) - the user who receives the notification
      - `type` (text) - notification type: download, open, expiry, system
      - `title` (text) - short title for the notification
      - `message` (text) - notification body text
      - `delivery_id` (uuid, nullable) - optional reference to related delivery
      - `read` (boolean, default false) - whether the notification has been read
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `notifications` table
    - Users can only read their own notifications
    - Users can update (mark as read) their own notifications
    - System can insert notifications for any user

  3. Indexes
    - Index on user_id + read for fast unread count queries
    - Index on user_id + created_at for listing
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  delivery_id uuid REFERENCES deliveries(id),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (type IN ('download', 'open', 'expiry', 'system'))
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
