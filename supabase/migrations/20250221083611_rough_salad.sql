-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_exercises" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_manage" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_manage_sets" ON set_details;
DROP POLICY IF EXISTS "allow_client_view_sets" ON set_details;

-- Reset RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE set_details ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for exercises
CREATE POLICY "exercises_select_policy"
ON exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

CREATE POLICY "exercises_trainer_policy"
ON exercises
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create simplified policies for set_details
CREATE POLICY "set_details_trainer_policy"
ON set_details
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "set_details_client_policy"
ON set_details
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM program_exercises pe
    JOIN training_programs tp ON tp.id = pe.program_id
    JOIN client_programs cp ON cp.program_id = tp.id
    JOIN clients c ON c.id = cp.client_id
    WHERE pe.id = set_details.program_exercise_id
    AND c.user_id = auth.uid()
  )
);