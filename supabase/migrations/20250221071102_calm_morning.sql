-- Drop existing policies
DROP POLICY IF EXISTS "trainers_view_exercises" ON exercises;
DROP POLICY IF EXISTS "trainers_insert_exercises" ON exercises;
DROP POLICY IF EXISTS "trainers_update_exercises" ON exercises;
DROP POLICY IF EXISTS "trainers_delete_exercises" ON exercises;

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
  AND (trainer_id IS NULL OR trainer_id = auth.uid())
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND (trainer_id IS NULL OR trainer_id = auth.uid())
);

-- Create a policy for viewing exercises
CREATE POLICY "view_exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

-- Update the delete_exercise function to be more robust
CREATE OR REPLACE FUNCTION delete_exercise(exercise_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id uuid;
  v_exercise_trainer_id uuid;
BEGIN
  -- Get the current user's ID
  SELECT auth.uid() INTO v_trainer_id;
  
  -- Check if the user is a trainer
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_trainer_id
    AND raw_user_meta_data->>'role' = 'trainer'
  ) THEN
    RETURN false;
  END IF;

  -- Get the exercise's trainer_id
  SELECT trainer_id INTO v_exercise_trainer_id
  FROM exercises
  WHERE id = exercise_id;

  -- Delete the exercise if it's a system exercise (trainer_id is null)
  -- or if it belongs to the current trainer
  DELETE FROM exercises 
  WHERE id = exercise_id
  AND (trainer_id IS NULL OR trainer_id = v_trainer_id);

  RETURN FOUND;
END;
$$;