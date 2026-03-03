/*
  # Fix super admin policies on deliveries and audit_logs

  1. Problem
    - Super admin policies on deliveries and audit_logs also query profiles table,
      which triggers the recursive profiles RLS evaluation.

  2. Changes
    - Replace profiles-subquery-based policies with JWT-based checks
    - Affects: deliveries, audit_logs

  3. Security
    - Same security level maintained, just using JWT claims instead of subquery
*/

DROP POLICY IF EXISTS "Super admins can read all deliveries" ON deliveries;
CREATE POLICY "Super admins can read all deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

DROP POLICY IF EXISTS "Super admins can read audit logs" ON audit_logs;
CREATE POLICY "Super admins can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );
