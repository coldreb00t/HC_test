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
CREATE POLICY "allow_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view programs

CREATE POLICY "allow_trainer_manage_programs"
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
CREATE POLICY "allow_view_program_exercises"
ON program_exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view program exercises

CREATE POLICY "allow_trainer_manage_program_exercises"
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
CREATE POLICY "allow_view_client_programs"
ON client_programs
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view client programs

CREATE POLICY "allow_trainer_manage_client_programs"
ON client_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);