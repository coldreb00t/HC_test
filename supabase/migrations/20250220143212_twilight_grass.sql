-- Drop existing policies
DROP POLICY IF EXISTS "trainers_view_workouts" ON workouts;
DROP POLICY IF EXISTS "trainers_insert_workouts" ON workouts;
DROP POLICY IF EXISTS "trainers_update_workouts" ON workouts;
DROP POLICY IF EXISTS "trainers_delete_workouts" ON workouts;
DROP POLICY IF EXISTS "clients_view_workouts" ON workouts;

-- Reset RLS
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create a single policy for trainers that handles all operations
CREATE POLICY "trainer_access"
ON workouts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'trainer'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'trainer'
  )
);

-- Create a simple policy for clients to view their workouts
CREATE POLICY "client_view"
ON workouts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);