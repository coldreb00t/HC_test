-- Drop existing policies
DROP POLICY IF EXISTS "trainer_manage_workouts" ON workouts;
DROP POLICY IF EXISTS "client_view_workouts" ON workouts;

-- Reset RLS
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create simplified trainer policy
CREATE POLICY "trainer_manage_workouts"
ON workouts
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create client view policy
CREATE POLICY "client_view_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);