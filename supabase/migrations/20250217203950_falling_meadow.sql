/*
  # Final fix for workouts table RLS policies

  1. Changes
    - Drop all existing policies
    - Create a single comprehensive policy for trainers
    - Maintain client access policy
  
  2. Security
    - Trainers can perform ALL operations on workouts
    - Clients can only view their own workouts
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Trainers can manage workouts" ON workouts;
DROP POLICY IF EXISTS "Trainers can create workouts" ON workouts;
DROP POLICY IF EXISTS "Trainers can view all workouts" ON workouts;
DROP POLICY IF EXISTS "Clients can view their workouts" ON workouts;

-- Create new, simplified policies
CREATE POLICY "Trainers full access"
ON workouts
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'trainer'
)
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'trainer'
);

CREATE POLICY "Clients read only access"
ON workouts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);