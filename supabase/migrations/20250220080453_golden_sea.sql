-- Drop all existing policies
DROP POLICY IF EXISTS "trainer_manage_all" ON training_programs;
DROP POLICY IF EXISTS "client_view_assigned" ON training_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for trainers using JWT claims
CREATE POLICY "trainer_manage_programs"
ON training_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create a simple policy for clients to view their assigned programs
CREATE POLICY "client_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT program_id 
    FROM client_programs 
    WHERE client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
);