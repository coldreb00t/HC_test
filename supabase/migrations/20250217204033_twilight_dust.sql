/*
  # Final fix for workouts table RLS policies

  1. Changes
    - Drop all existing policies
    - Create a single, simplified policy for trainers
    - Maintain client access policy
  
  2. Security
    - Trainers can perform ALL operations on workouts
    - Clients can only view their own workouts
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Trainers full access" ON workouts;
DROP POLICY IF EXISTS "Trainers can manage workouts" ON workouts;
DROP POLICY IF EXISTS "Trainers can create workouts" ON workouts;
DROP POLICY IF EXISTS "Trainers can view all workouts" ON workouts;
DROP POLICY IF EXISTS "Clients can view their workouts" ON workouts;
DROP POLICY IF EXISTS "Clients read only access" ON workouts;

-- Create new, simplified policies
CREATE POLICY "trainer_full_access"
ON workouts
FOR ALL
TO authenticated
USING (
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'trainer'
)
WITH CHECK (
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'trainer'
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