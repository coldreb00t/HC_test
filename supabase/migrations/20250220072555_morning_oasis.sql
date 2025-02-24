-- Drop existing policies
DROP POLICY IF EXISTS "trainer_view_clients" ON clients;
DROP POLICY IF EXISTS "trainer_manage_clients" ON clients;
DROP POLICY IF EXISTS "client_view_own_profile" ON clients;
DROP POLICY IF EXISTS "client_update_own_profile" ON clients;
DROP POLICY IF EXISTS "client_registration" ON clients;

-- Reset RLS
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create trainer policy
CREATE POLICY "trainer_full_access"
ON clients
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create client policies
CREATE POLICY "client_view_own_profile"
ON clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY "client_registration"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'client'
  AND user_id = auth.uid()
);