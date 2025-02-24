-- Drop existing policies
DROP POLICY IF EXISTS "trainer_manage_programs" ON training_programs;
DROP POLICY IF EXISTS "trainer_manage_exercises" ON program_exercises;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises DISABLE ROW LEVEL SECURITY;

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for training_programs
CREATE POLICY "trainer_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainer_insert_programs"
ON training_programs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "trainer_update_programs"
ON training_programs
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "trainer_delete_programs"
ON training_programs
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

-- Create policies for program_exercises
CREATE POLICY "trainer_view_exercises"
ON program_exercises
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM training_programs tp
    WHERE tp.id = program_exercises.program_id
    AND auth.jwt() ->> 'role' = 'trainer'
  )
);

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