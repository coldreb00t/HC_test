-- Drop existing policies
DROP POLICY IF EXISTS "trainer_full_access" ON clients;
DROP POLICY IF EXISTS "client_view_own_profile" ON clients;
DROP POLICY IF EXISTS "client_registration" ON clients;

-- Reset RLS
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows registration during signup
CREATE POLICY "allow_registration"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow any authenticated user to insert

-- Create a policy for trainers to manage all clients
CREATE POLICY "trainer_manage_clients"
ON clients
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create a policy for clients to view their own profile
CREATE POLICY "client_view_own_profile"
ON clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);