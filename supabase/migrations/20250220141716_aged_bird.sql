-- Drop existing policies
DROP POLICY IF EXISTS "allow_registration" ON clients;
DROP POLICY IF EXISTS "trainer_view_all" ON clients;
DROP POLICY IF EXISTS "client_view_own" ON clients;
DROP POLICY IF EXISTS "trainer_view_workouts" ON workouts;
DROP POLICY IF EXISTS "trainer_insert_workouts" ON workouts;
DROP POLICY IF EXISTS "trainer_update_workouts" ON workouts;
DROP POLICY IF EXISTS "trainer_delete_workouts" ON workouts;
DROP POLICY IF EXISTS "client_view_workouts" ON workouts;

-- Reset RLS
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for clients table
CREATE POLICY "allow_client_registration"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'client'
  AND user_id = auth.uid()
);

CREATE POLICY "trainer_access_clients"
ON clients
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_access_own"
ON clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Create simplified policies for workouts table
CREATE POLICY "trainer_manage_workouts"
ON workouts
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

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