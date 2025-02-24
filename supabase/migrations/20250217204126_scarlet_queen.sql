/*
  # Fix workouts RLS policies to avoid users table access

  1. Changes
    - Drop all existing policies
    - Create new policies using JWT claims instead of direct table access
    - Simplify role checking logic
  
  2. Security
    - Trainers can perform ALL operations on workouts
    - Clients can only view their own workouts
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "trainer_full_access" ON workouts;
DROP POLICY IF EXISTS "client_read_access" ON workouts;

-- Create new policies using JWT claims
CREATE POLICY "trainer_full_access"
ON workouts
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_read_access"
ON workouts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);