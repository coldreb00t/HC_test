/*
  # Fix RLS policies for program exercises

  1. Changes
    - Use get_user_role() function for role checking
    - Simplify RLS policies for program exercises
    - Ensure proper access control for trainers and clients
  
  2. Security
    - Enable RLS on program_exercises table
    - Trainers have full access to manage exercises
    - Clients can only view exercises from their assigned programs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "trainers_full_access_program_exercises" ON program_exercises;
DROP POLICY IF EXISTS "clients_view_own_program_exercises" ON program_exercises;

-- Reset RLS
ALTER TABLE program_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;

-- Create trainer policy using get_user_role()
CREATE POLICY "trainer_manage_program_exercises"
ON program_exercises
FOR ALL
TO authenticated
USING (
  get_user_role() = 'trainer'
)
WITH CHECK (
  get_user_role() = 'trainer'
);

-- Create client view policy
CREATE POLICY "client_view_program_exercises"
ON program_exercises
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'client' AND
  program_id IN (
    SELECT program_id 
    FROM client_programs 
    WHERE client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
);