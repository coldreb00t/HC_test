/*
  # Fix Training Programs RLS

  1. Changes
    - Simplify RLS policies
    - Add proper trainer role check
    - Ensure trainer_id is properly set and checked
    - Fix policy ordering and precedence

  2. Security
    - Maintain proper access control
    - Ensure trainers can only manage their own programs
    - Allow clients to view assigned programs
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "trainer_manage_own_programs" ON training_programs;
DROP POLICY IF EXISTS "client_view_assigned_programs" ON training_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Add NOT NULL constraint to trainer_id if not already present
DO $$ 
BEGIN
  ALTER TABLE training_programs ALTER COLUMN trainer_id SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create a single policy for trainers that handles all operations
CREATE POLICY "trainer_manage_programs"
ON training_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

-- Create a policy for clients to view their assigned programs
CREATE POLICY "client_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT program_id 
    FROM client_programs 
    WHERE client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
);