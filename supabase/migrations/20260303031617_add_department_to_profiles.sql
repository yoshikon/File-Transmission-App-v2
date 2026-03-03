/*
  # Add department column to profiles

  1. Modified Tables
    - `profiles`
      - Added `department` (text, default '') - user's department name

  2. Notes
    - Non-destructive addition of a new column
    - Default empty string ensures backwards compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'department'
  ) THEN
    ALTER TABLE profiles ADD COLUMN department text NOT NULL DEFAULT '';
  END IF;
END $$;
