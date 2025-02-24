-- Drop existing policies
DROP POLICY IF EXISTS "allow_select_exercises" ON exercises;
DROP POLICY IF EXISTS "allow_insert_exercises" ON exercises;
DROP POLICY IF EXISTS "allow_update_exercises" ON exercises;
DROP POLICY IF EXISTS "allow_delete_exercises" ON exercises;

-- Reset RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create a single policy for trainers that handles all operations
CREATE POLICY "trainer_manage_exercises"
ON exercises
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Create a policy for viewing exercises
CREATE POLICY "view_exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises