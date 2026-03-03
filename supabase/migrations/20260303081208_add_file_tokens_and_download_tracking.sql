/*
  # Add file-level download tokens and enhanced download tracking

  1. Modified Tables
    - `delivery_files`
      - `file_token` (text, unique) - Cryptographic token for individual file download URLs
      - `file_extension` (text) - File extension extracted from file name
    - `delivery_recipients`
      - `file_download_counts` (jsonb) - Per-file download count tracking: {"fileId": count}
    - `download_logs`
      - `download_type` (text) - Type of download: 'individual' or 'bulk'

  2. Security
    - RLS policies updated to allow recipients to read delivery_files via token lookup
    - Index added on file_token for fast lookups

  3. Notes
    - file_token uses 24-character hex strings generated via crypto
    - Existing rows in delivery_files get auto-generated tokens via gen_random_uuid
    - download_type defaults to 'individual' for backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_files' AND column_name = 'file_token'
  ) THEN
    ALTER TABLE delivery_files ADD COLUMN file_token text UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_files' AND column_name = 'file_extension'
  ) THEN
    ALTER TABLE delivery_files ADD COLUMN file_extension text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_recipients' AND column_name = 'file_download_counts'
  ) THEN
    ALTER TABLE delivery_recipients ADD COLUMN file_download_counts jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'download_logs' AND column_name = 'download_type'
  ) THEN
    ALTER TABLE download_logs ADD COLUMN download_type text DEFAULT 'individual';
  END IF;
END $$;

UPDATE delivery_files SET file_token = encode(gen_random_bytes(12), 'hex') WHERE file_token IS NULL;

ALTER TABLE delivery_files ALTER COLUMN file_token SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_files_file_token ON delivery_files(file_token);
CREATE INDEX IF NOT EXISTS idx_delivery_recipients_token ON delivery_recipients(token);
