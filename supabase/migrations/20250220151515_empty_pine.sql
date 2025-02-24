-- Drop all existing policies
DROP POLICY IF EXISTS "allow_trainers_full_access" ON training_programs;
DROP POLICY IF EXISTS "allow_clients_view_programs" ON training_programs;
DROP POLICY IF EXISTS "allow_trainers_manage_exercises" ON program_exercises;
DROP POLICY IF EXISTS "allow_clients_view_exercises" ON program_exercises;
DROP POLICY IF EXISTS "allow_trainers_manage_assignments" ON client_programs;
DROP POLICY IF EXISTS "allow_clients_view_assignments" ON client_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs DISABLE ROW LEVEL SECURITY;

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;

-- Create a function to check if user is a trainer
CREATE OR REPLACE FUNCTION is_trainer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'trainer'
    )
  );
END;
$$;

-- Create a function to check if user owns a client profile
CREATE OR REPLACE FUNCTION owns_client_profile(client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM clients
      WHERE id = client_id
      AND user_id = auth.uid()
    )
  );
END;
$$;

-- Create simplified policies for training_programs
CREATE POLICY "trainers_full_access_programs"
ON training_programs
FOR ALL
TO authenticated
USING (is_trainer())
WITH CHECK (is_trainer());

-- Create simplified policies for program_exercises
CREATE POLICY "trainers_full_access_exercises"
ON program_exercises
FOR ALL
TO authenticated
USING (is_trainer())
WITH CHECK (is_trainer());

-- Create simplified policies for client_programs
CREATE POLICY "trainers_full_access_assignments"
ON client_programs
FOR ALL
TO authenticated
USING (is_trainer())
WITH CHECK (is_trainer());

-- Create view policies for clients
CREATE POLICY "clients_view_assigned_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_programs cp
    WHERE cp.program_id = training_programs.id
    AND owns_client_profile(cp.client_id)
  )
);

CREATE POLICY "clients_view_program_exercises"
ON program_exercises
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_programs cp
    WHERE cp.program_id = program_exercises.program_id
    AND owns_client_profile(cp.client_id)
  )
);

CREATE POLICY "clients_view_own_assignments"
ON client_programs
FOR SELECT
TO authenticated
USING (owns_client_profile(client_id));