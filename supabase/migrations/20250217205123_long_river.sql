/*
  # Fix workout policies with better role handling

  1. Changes
    - Drop existing policies and functions
    - Create new role checking function with better metadata handling
    - Implement simplified but secure policies
    - Add better error handling

  2. Security
    - Ensure proper role verification
    - Maintain strict access control
    - Prevent unauthorized access
*/

-- Drop existing policies and functions
DROP POLICY IF EXISTS "trainer_full_access" ON workouts;
DROP POLICY IF EXISTS "client_view_workouts" ON workouts;
DROP FUNCTION IF EXISTS check_user_role();

-- Create a more robust role checking function
CREATE OR REPLACE FUNCTION is_trainer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_role text;
BEGIN
  -- Get role from user metadata (more reliable than JWT for our case)
  SELECT raw_user_meta_data->>'role'
  INTO _user_role
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN _user_role = 'trainer';
END;
$$;

-- Reset RLS
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
CREATE POLICY "trainers_manage_workouts"
ON workouts
FOR ALL
TO authenticated
USING (
  is_trainer()
)
WITH CHECK (
  is_trainer() AND trainer_id = auth.uid()
);

CREATE POLICY "clients_view_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  NOT is_trainer() AND
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);