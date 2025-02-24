-- Drop existing policies
DROP POLICY IF EXISTS "allow_select_exercises" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_manage" ON exercises;

-- Reset RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for exercises
CREATE POLICY "allow_select_exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

CREATE POLICY "allow_trainer_manage"
ON exercises
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);