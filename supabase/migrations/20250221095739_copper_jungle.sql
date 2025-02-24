-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_strength_exercises" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_insert_strength" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_update_strength" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_delete_strength" ON strength_exercises;

-- Reset RLS
ALTER TABLE strength_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE strength_exercises ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for strength exercises
CREATE POLICY "allow_view_strength_exercises"
ON strength_exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

CREATE POLICY "allow_trainer_manage_strength"
ON strength_exercises
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);