-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own client profile" ON clients;
DROP POLICY IF EXISTS "Trainers can view all clients" ON clients;
DROP POLICY IF EXISTS "Clients can view own profile" ON clients;

-- Reset RLS
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for clients table
CREATE POLICY "trainer_access_clients"
ON clients
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_access_own_profile"
ON clients
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Create policy for client registration
CREATE POLICY "allow_client_registration"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'client'
  AND user_id = auth.uid()
);