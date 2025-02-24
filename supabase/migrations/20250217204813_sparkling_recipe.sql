/*
  # Update workout policies with role-based checks

  1. Changes
    - Drop existing policies
    - Create new policies with explicit role checks
    - Add trainer-specific policies for CRUD operations
    - Add client-specific policy for viewing workouts

  2. Security
    - Ensure trainers can only manage their own workouts
    - Clients can only view workouts they are assigned to
    - All policies use role checks from JWT claims
*/

-- Drop existing policies
DROP POLICY IF EXISTS "trainers_select_workouts" ON workouts;
DROP POLICY IF EXISTS "trainers_insert_workouts" ON workouts;
DROP POLICY IF EXISTS "trainers_update_workouts" ON workouts;
DROP POLICY IF EXISTS "trainers_delete_workouts" ON workouts;
DROP POLICY IF EXISTS "clients_view_own_workouts" ON workouts;

-- Create trainer policies
CREATE POLICY "trainer_view_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainer_manage_own_workouts"
ON workouts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "trainer_update_own_workouts"
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

CREATE POLICY "trainer_delete_own_workouts"
ON workouts
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

-- Create client policy
CREATE POLICY "client_view_assigned_workouts"
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