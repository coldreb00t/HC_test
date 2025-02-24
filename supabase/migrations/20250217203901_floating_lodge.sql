/*
  # Fix workouts table RLS policies

  1. Changes
    - Drop existing policies
    - Create new, more permissive policy for trainers
    - Maintain client access restrictions
  
  2. Security
    - Trainers can manage all workouts
    - Clients can only view their own workouts
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Trainers can create workouts" ON workouts;
DROP POLICY IF EXISTS "Trainers can view all workouts" ON workouts;
DROP POLICY IF EXISTS "Clients can view their workouts" ON workouts;

-- Create new policies
CREATE POLICY "Trainers can manage workouts"
ON workouts
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'trainer'
)
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'trainer'
);

CREATE POLICY "Clients can view their workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);