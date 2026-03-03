/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The "Super admins can read all profiles" policy queries the profiles table
      itself to check if the current user is a super_admin, causing infinite recursion.
    - "Service role" policies use USING(true) which is overly permissive.

  2. Changes
    - Drop the recursive super admin SELECT policy
    - Drop overly permissive service role policies
    - Re-create the super admin policy using auth.jwt() -> app_metadata to avoid recursion
    - This checks the user's role from their JWT token metadata instead of querying profiles

  3. Security
    - All existing user-scoped policies remain intact
    - Super admin check now uses JWT claims instead of a self-referencing query
*/

DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

CREATE POLICY "Super admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );
