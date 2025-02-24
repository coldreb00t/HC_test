/*
  # Fix clients table access policies

  1. Changes
    - Reset RLS policies for clients table
    - Add simplified policies for trainers and clients
    - Ensure trainers can view all clients
    - Allow clients to view only their own profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "trainer_access_clients" ON clients;
DROP POLICY IF EXISTS "client_access_own_profile" ON clients;
DROP POLICY IF EXISTS "allow_client_registration" ON clients;

-- Reset RLS
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create simplified trainer policy
CREATE POLICY "trainer_view_all_clients"
ON clients
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create client policy
CREATE POLICY "client_view_own_profile"
ON clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Create registration policy
CREATE POLICY "client_registration"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'client'
  AND user_id = auth.uid()
);