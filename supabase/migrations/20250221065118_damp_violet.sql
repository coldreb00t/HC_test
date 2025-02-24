-- Drop existing policies for exercises table
DROP POLICY IF EXISTS "trainer_access_exercises" ON exercises;
DROP POLICY IF EXISTS "client_view_exercises" ON exercises;

-- Reset RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create separate policies for different operations
CREATE POLICY "trainers_view_exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

CREATE POLICY "trainers_insert_exercises"
ON exercises
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainers_update_exercises"
ON exercises
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND (trainer_id IS NULL OR trainer_id = auth.uid())
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND (trainer_id IS NULL OR trainer_id = auth.uid())
);

CREATE POLICY "trainers_delete_exercises"
ON exercises
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND (trainer_id IS NULL OR trainer_id = auth.uid())
);

-- Create a function to handle exercise deletion
CREATE OR REPLACE FUNCTION delete_exercise(exercise_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is a trainer
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'trainer'
  ) THEN
    RAISE EXCEPTION 'Only trainers can delete exercises';
  END IF;

  -- Delete the exercise
  DELETE FROM exercises WHERE id = exercise_id
  AND (trainer_id IS NULL OR trainer_id = auth.uid());

  RETURN FOUND;
END;
$$;