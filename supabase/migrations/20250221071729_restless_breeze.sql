-- Drop existing policies
DROP POLICY IF EXISTS "trainer_manage_exercises" ON exercises;
DROP POLICY IF EXISTS "view_exercises" ON exercises;

-- Reset RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create separate policies for different operations
CREATE POLICY "view_exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

CREATE POLICY "trainer_insert_exercises"
ON exercises
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "trainer_update_exercises"
ON exercises
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

CREATE POLICY "trainer_delete_exercises"
ON exercises
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

-- Create a function to handle exercise deletion
CREATE OR REPLACE FUNCTION delete_exercise(exercise_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id uuid;
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

  -- Delete the exercise if it belongs to the current trainer
  DELETE FROM exercises 
  WHERE id = exercise_id
  AND trainer_id = v_trainer_id;

  RETURN FOUND;
END;
$$;