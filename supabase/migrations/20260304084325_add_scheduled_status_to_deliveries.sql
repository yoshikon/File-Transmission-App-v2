/*
  # Add 'scheduled' status to deliveries

  1. Changes
    - Update the deliveries status check constraint to include 'scheduled'
    - This allows deliveries to be created with a future send time
    - The scheduled-tasks edge function will process these and change status to 'sent'
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'deliveries_status_check' AND table_name = 'deliveries'
  ) THEN
    ALTER TABLE deliveries DROP CONSTRAINT deliveries_status_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'deliveries_status_check' AND table_name = 'deliveries'
  ) THEN
    ALTER TABLE deliveries ADD CONSTRAINT deliveries_status_check
      CHECK (status = ANY (ARRAY['draft', 'sent', 'scheduled', 'expired', 'revoked']));
  END IF;
END $$;
