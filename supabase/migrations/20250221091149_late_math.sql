-- Drop existing policies
DROP POLICY IF EXISTS "trainer_view_programs" ON training_programs;
DROP POLICY IF EXISTS "trainer_insert_programs" ON training_programs;
DROP POLICY IF EXISTS "trainer_update_programs" ON training_programs;
DROP POLICY IF EXISTS "trainer_delete_programs" ON training_programs;
DROP POLICY IF EXISTS "trainer_view_exercises" ON program_exercises;
DROP POLICY IF EXISTS "trainer_manage_exercises" ON program_exercises;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises DISABLE ROW LEVEL SECURITY;

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for training_programs
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

-- Create simplified policies for program_exercises
CREATE POLICY "trainer_manage_exercises"
ON program_exercises
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM training_programs tp
    WHERE tp.id = program_exercises.program_id
    AND auth.jwt() ->> 'role' = 'trainer'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM training_programs tp
    WHERE tp.id = program_exercises.program_id
    AND auth.jwt() ->> 'role' = 'trainer'
  )
);