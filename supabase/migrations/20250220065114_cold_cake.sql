/*
  # Fix RLS policies for training programs - Version 2

  1. Changes
    - Drop all existing policies for training_programs table
    - Create a single, simplified policy for trainers
    - Add policy for client access
  
  2. Security
    - Enable RLS on training_programs table
    - Ensure trainers have full access
    - Allow clients to view only their assigned programs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "trainers_select_programs" ON training_programs;
DROP POLICY IF EXISTS "trainers_insert_programs" ON training_programs;
DROP POLICY IF EXISTS "trainers_update_programs" ON training_programs;
DROP POLICY IF EXISTS "trainers_delete_programs" ON training_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Create simplified trainer policy
CREATE POLICY "trainer_full_access"
ON training_programs
FOR ALL 
TO authenticated
USING (
  COALESCE(current_setting('request.jwt.claims', true)::json->>'role', 'none') = 'trainer'
)
WITH CHECK (
  COALESCE(current_setting('request.jwt.claims', true)::json->>'role', 'none') = 'trainer'
);

-- Create client view policy
CREATE POLICY "client_view_assigned_programs"
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