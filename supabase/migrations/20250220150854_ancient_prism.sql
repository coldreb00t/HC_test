-- Drop existing policies
DROP POLICY IF EXISTS "trainer_manage_programs" ON training_programs;
DROP POLICY IF EXISTS "trainer_manage_exercises" ON program_exercises;
DROP POLICY IF EXISTS "trainer_manage_assignments" ON client_programs;
DROP POLICY IF EXISTS "client_view_assignments" ON client_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs DISABLE ROW LEVEL SECURITY;

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for training_programs
CREATE POLICY "trainers_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainers_insert_programs"
ON training_programs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainers_update_programs"
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

CREATE POLICY "trainers_delete_programs"
ON training_programs
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

-- Create policies for program_exercises
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