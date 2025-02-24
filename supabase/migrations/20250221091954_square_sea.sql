-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_exercises_new" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_manage_new" ON exercises;

-- Reset RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Add trainer_id column if it doesn't exist
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS trainer_id uuid REFERENCES auth.users(id);

-- Create index for trainer_id
CREATE INDEX IF NOT EXISTS exercises_trainer_id_idx ON exercises(trainer_id);

-- Create simplified policies for exercises
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
  AND trainer_id = auth.uid()
);

CREATE POLICY "allow_trainer_update"
ON exercises
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND (trainer_id = auth.uid() OR trainer_id IS NULL)
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND (trainer_id = auth.uid() OR trainer_id IS NULL)
);

CREATE POLICY "allow_trainer_delete"
ON exercises
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND (trainer_id = auth.uid() OR trainer_id IS NULL)
);