/*
  # Fix RLS policies for training programs - Version 3

  1. Changes
    - Add debugging function
    - Simplify RLS policies further
    - Use auth.uid() directly for role checking
  
  2. Security
    - Enable RLS on training_programs table
    - Ensure trainers have full access
    - Allow clients to view only their assigned programs
*/

-- Create a function to check user role and debug RLS issues
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _role text;
BEGIN
    -- Try to get role from user metadata (most reliable)
    SELECT raw_user_meta_data->>'role'
    INTO _role
    FROM auth.users
    WHERE id = auth.uid();
    
    RETURN _role;
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "trainer_full_access" ON training_programs;
DROP POLICY IF EXISTS "client_view_assigned_programs" ON training_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Create trainer policy using the new function
CREATE POLICY "trainer_manage_programs"
ON training_programs
FOR ALL
TO authenticated
USING (
  get_user_role() = 'trainer'
)
WITH CHECK (
  get_user_role() = 'trainer'
);

-- Create client view policy
CREATE POLICY "client_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'client' AND
  id IN (
    SELECT program_id 
    FROM client_programs 
    WHERE client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
);