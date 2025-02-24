-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_programs" ON training_programs;
DROP POLICY IF EXISTS "allow_trainer_manage_programs" ON training_programs;
DROP POLICY IF EXISTS "allow_view_program_exercises" ON program_exercises;
DROP POLICY IF EXISTS "allow_trainer_manage_program_exercises" ON program_exercises;
DROP POLICY IF EXISTS "allow_view_client_programs" ON client_programs;
DROP POLICY IF EXISTS "allow_trainer_manage_client_programs" ON client_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs DISABLE ROW LEVEL SECURITY;

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;

-- Create policies for training_programs
CREATE POLICY "trainer_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  OR EXISTS (
    SELECT 1 FROM client_programs cp
    JOIN clients c ON c.id = cp.client_id
    WHERE cp.program_id = training_programs.id
    AND c.user_id = auth.uid()
  )
);

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

-- Create policies for program_exercises
CREATE POLICY "trainer_view_exercises"
ON program_exercises
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  OR EXISTS (
    SELECT 1 FROM client_programs cp
    JOIN clients c ON c.id = cp.client_id
    WHERE cp.program_id = program_exercises.program_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "trainer_manage_exercises"
ON program_exercises
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create policies for client_programs
CREATE POLICY "trainer_view_assignments"
ON client_programs
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  OR client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "trainer_manage_assignments"
ON client_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);