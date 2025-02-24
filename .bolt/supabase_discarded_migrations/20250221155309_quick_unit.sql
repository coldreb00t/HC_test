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
CREATE POLICY "trainer_manage_programs"
ON training_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "client_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_programs cp
    WHERE cp.program_id = training_programs.id
    AND cp.client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
);

-- Create policies for program_exercises
CREATE POLICY "trainer_manage_exercises"
ON program_exercises
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM training_programs tp
    WHERE tp.id = program_exercises.program_id
    AND tp.trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM training_programs tp
    WHERE tp.id = program_exercises.program_id
    AND tp.trainer_id = auth.uid()
  )
);

CREATE POLICY "client_view_exercises"
ON program_exercises
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM training_programs tp
    JOIN client_programs cp ON cp.program_id = tp.id
    WHERE tp.id = program_exercises.program_id
    AND cp.client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
);

-- Create policies for client_programs
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

CREATE POLICY "client_view_assignments"
ON client_programs
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);