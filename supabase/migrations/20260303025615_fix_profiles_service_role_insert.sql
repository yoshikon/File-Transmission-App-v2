/*
  # Allow service role to insert profiles

  The auth trigger that creates profiles on user signup needs to be able to 
  insert into the profiles table. This adds a permissive policy for the 
  service_role and also grants necessary permissions to ensure the trigger 
  function works correctly.

  Additionally, we grant INSERT permission on profiles to the postgres role
  explicitly so the SECURITY DEFINER function can bypass RLS properly.
*/

GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
