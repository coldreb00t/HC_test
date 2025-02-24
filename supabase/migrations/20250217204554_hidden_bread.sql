/*
  # Improve RLS policies for workouts and clients

  1. Changes
    - Add more specific policies for workouts table
    - Improve security by adding explicit checks
  
  2. Security
    - Trainers can manage all workouts
    - Clients can only view their own workouts
    - Added explicit role checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "trainer_full_access" ON workouts;
DROP POLICY IF EXISTS "client_read_access" ON workouts;

-- Create more specific policies for workouts
CREATE POLICY "trainers_select_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainers_insert_workouts"
ON workouts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "trainers_update_workouts"
ON workouts
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "trainers_delete_workouts"
ON workouts
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "clients_view_own_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'client'
  AND client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);