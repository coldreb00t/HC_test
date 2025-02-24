-- Drop existing policies
DROP POLICY IF EXISTS "trainer_manage_programs" ON training_programs;
DROP POLICY IF EXISTS "client_view_programs" ON training_programs;
DROP POLICY IF EXISTS "trainer_manage_program_exercises" ON program_exercises;
DROP POLICY IF EXISTS "client_view_program_exercises" ON program_exercises;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;

-- Create simplified trainer policy for training programs
CREATE POLICY "trainer_access_programs"
ON training_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create simplified client policy for training programs
CREATE POLICY "client_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'client'
  OR auth.jwt() ->> 'role' = 'trainer'
);

-- Create simplified trainer policy for program exercises
CREATE POLICY "trainer_access_program_exercises"
ON program_exercises
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create simplified client policy for program exercises
CREATE POLICY "client_view_program_exercises"
ON program_exercises
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'client'
  OR auth.jwt() ->> 'role' = 'trainer'
);