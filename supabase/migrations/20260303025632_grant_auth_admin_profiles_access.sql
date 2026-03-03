/*
  # Grant auth admin access to profiles table

  The `supabase_auth_admin` role executes the trigger on auth.users.
  Even though our trigger function is SECURITY DEFINER owned by postgres,
  we need to ensure the auth admin role has the necessary grants on the
  profiles table for the trigger to succeed.
*/

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.profiles TO supabase_auth_admin;
