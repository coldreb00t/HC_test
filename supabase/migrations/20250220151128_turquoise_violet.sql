-- Drop existing policies
DROP POLICY IF EXISTS "trainer_view_programs" ON training_programs;
DROP POLICY IF EXISTS "trainer_manage_programs" ON training_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Create a single policy for trainers that allows all operations
CREATE POLICY "trainer_full_access"
ON training_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create a policy for clients to view their assigned programs
CREATE POLICY "client_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_programs cp
    JOIN clients c ON c.id = cp.client_id
    WHERE cp.program_id = training_programs.id
    AND c.user_id = auth.uid()
  )
);