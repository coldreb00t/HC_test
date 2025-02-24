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

-- Create a function to check trainer role
CREATE OR REPLACE FUNCTION is_trainer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'trainer'
  );
END;
$$;

-- Create simplified policies for training_programs
CREATE POLICY "tp_trainer_access"
ON training_programs
FOR ALL
TO authenticated
USING (is_trainer())
WITH CHECK (is_trainer());

-- Create simplified policies for program_exercises
CREATE POLICY "pe_trainer_access"
ON program_exercises
FOR ALL
TO authenticated
USING (is_trainer())
WITH CHECK (is_trainer());

-- Create simplified policies for client_programs
CREATE POLICY "cp_trainer_access"
ON client_programs
FOR ALL
TO authenticated
USING (is_trainer())
WITH CHECK (is_trainer());

-- Create view policies for clients
CREATE POLICY "tp_client_view"
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

CREATE POLICY "pe_client_view"
ON program_exercises
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_programs cp
    JOIN clients c ON c.id = cp.client_id
    WHERE cp.program_id = program_exercises.program_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "cp_client_view"
ON client_programs
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);