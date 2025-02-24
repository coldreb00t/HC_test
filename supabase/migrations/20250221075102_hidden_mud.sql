-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_exercises" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_insert" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_update" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_delete" ON exercises;

-- Reset RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for exercises
CREATE POLICY "allow_view_exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

CREATE POLICY "allow_trainer_insert"
ON exercises
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "allow_trainer_update"
ON exercises
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "allow_trainer_delete"
ON exercises
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);