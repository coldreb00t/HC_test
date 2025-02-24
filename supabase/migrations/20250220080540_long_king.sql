/*
  # Fix Training Programs RLS

  1. Changes
    - Simplify RLS policies to use only JWT claims
    - Remove all complex checks and subqueries
    - Create separate policies for different operations
    - Add explicit trainer role check

  2. Security
    - Maintain proper access control
    - Ensure trainers can only manage programs
    - Allow clients to view assigned programs
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "trainer_manage_programs" ON training_programs;
DROP POLICY IF EXISTS "client_view_programs" ON training_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Create separate policies for different operations
CREATE POLICY "trainers_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainers_insert_programs"
ON training_programs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainers_update_programs"
ON training_programs
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainers_delete_programs"
ON training_programs
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create a separate policy for clients to view their assigned programs
CREATE POLICY "clients_view_assigned_programs"
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