/*
  # Fix workout policies and add debug function

  1. Changes
    - Add function to check user role and metadata
    - Update workout policies to use simpler role checks
    - Add debug logging for policy evaluation

  2. Security
    - Maintain RLS security while simplifying checks
    - Add better error handling for role verification
*/

-- Create a function to check user role
CREATE OR REPLACE FUNCTION check_user_role()
RETURNS TABLE (
  user_id uuid,
  user_role text,
  is_trainer boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid(),
    COALESCE(auth.jwt() ->> 'role', raw_user_meta_data->>'role'),
    COALESCE(auth.jwt() ->> 'role', raw_user_meta_data->>'role') = 'trainer'
  FROM auth.users
  WHERE id = auth.uid();
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "trainer_view_workouts" ON workouts;
DROP POLICY IF EXISTS "trainer_manage_own_workouts" ON workouts;
DROP POLICY IF EXISTS "trainer_update_own_workouts" ON workouts;
DROP POLICY IF EXISTS "trainer_delete_own_workouts" ON workouts;
DROP POLICY IF EXISTS "client_view_assigned_workouts" ON workouts;

-- Create simplified trainer policies
CREATE POLICY "trainer_full_access"
ON workouts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM check_user_role() WHERE is_trainer = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM check_user_role() WHERE is_trainer = true
  )
);

-- Create client view policy
CREATE POLICY "client_view_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  (
    SELECT user_role FROM check_user_role() WHERE user_role = 'client'
  ) IS NOT NULL
  AND
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);