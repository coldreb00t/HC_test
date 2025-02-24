-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Trainers can manage client programs" ON client_programs;
DROP POLICY IF EXISTS "Clients can view own programs" ON client_programs;

-- Reset RLS
ALTER TABLE client_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;

-- Create trainer policy using get_user_role()
CREATE POLICY "trainer_manage_client_programs"
ON client_programs
FOR ALL
TO authenticated
USING (
  get_user_role() = 'trainer'
)
WITH CHECK (
  get_user_role() = 'trainer'
);

-- Create client view policy
CREATE POLICY "client_view_own_programs"
ON client_programs
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'client' AND
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);