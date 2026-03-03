/*
  # Fix profile creation trigger to bypass RLS

  When a new user signs up, the `handle_new_user` trigger creates a profile row.
  However, RLS on the `profiles` table blocks the INSERT because the trigger
  runs before the user session is fully established.

  This migration recreates the function with `SET search_path = ''` for security
  and uses `SECURITY DEFINER` with an explicit RLS bypass by setting the function
  owner and altering the function to bypass RLS checks.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'sender')
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION handle_new_user() OWNER TO postgres;
