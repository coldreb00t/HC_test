/*
  # Fix workouts table RLS policies

  1. Changes
    - Update RLS policy for trainers to properly handle workout creation
    - Ensure trainer_id is properly checked against the authenticated user
    - Add separate policies for insert and select operations

  2. Security
    - Trainers can create and view all workouts
    - Clients can only view their own workouts
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Trainers can manage their workouts" ON workouts;
DROP POLICY IF EXISTS "Clients can view their workouts" ON workouts;

-- Create new policies
CREATE POLICY "Trainers can create workouts"
ON workouts
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only trainers can create workouts
  (auth.jwt() ->> 'role')::text = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "Trainers can view all workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'trainer'
);

CREATE POLICY "Clients can view their workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  -- Clients can only see their own workouts
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);