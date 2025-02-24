-- Drop existing policies
DROP POLICY IF EXISTS "view_exercises" ON exercises;
DROP POLICY IF EXISTS "trainer_insert_exercises" ON exercises;
DROP POLICY IF EXISTS "trainer_update_exercises" ON exercises;
DROP POLICY IF EXISTS "trainer_delete_exercises" ON exercises;

-- Reset RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for exercises
CREATE POLICY "view_exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

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