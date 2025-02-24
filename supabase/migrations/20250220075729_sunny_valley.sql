/*
  # Fix training programs policies

  1. Changes
    - Simplify RLS policies for training_programs table
    - Remove trainer_id check that was causing issues
    - Allow trainers full access to all programs
    - Allow clients to view only their assigned programs
  
  2. Security
    - Enable RLS on training_programs table
    - Add policies for trainers and clients
*/

-- Drop existing policies
DROP POLICY IF EXISTS "trainer_manage_programs" ON training_programs;
DROP POLICY IF EXISTS "client_view_programs" ON training_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Create simplified trainer policy
CREATE POLICY "trainer_full_access"
ON training_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create client view policy
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