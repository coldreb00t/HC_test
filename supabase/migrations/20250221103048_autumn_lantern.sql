-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_strength_exercises" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_manage_strength" ON strength_exercises;

-- Reset RLS
ALTER TABLE strength_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE strength_exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for strength exercises
CREATE POLICY "allow_view_strength_exercises"
ON strength_exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

CREATE POLICY "allow_trainer_insert_strength"
ON strength_exercises
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "allow_trainer_update_strength"
ON strength_exercises
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

CREATE POLICY "allow_trainer_delete_strength"
ON strength_exercises
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);