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
  AND trainer_id = auth.uid()  -- Ensure trainer can only create exercises with their ID
);

CREATE POLICY "allow_trainer_update"
ON exercises
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()  -- Can only update own exercises
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()  -- Can only update own exercises
);

CREATE POLICY "allow_trainer_delete"
ON exercises
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()  -- Can only delete own exercises
);

-- Create a function to copy system exercises
CREATE OR REPLACE FUNCTION copy_system_exercise(exercise_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id uuid;
  v_new_exercise_id uuid;
BEGIN
  -- Get the current user's ID
  SELECT auth.uid() INTO v_trainer_id;
  
  -- Check if the user is a trainer
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_trainer_id
    AND raw_user_meta_data->>'role' = 'trainer'
  ) THEN
    RAISE EXCEPTION 'Only trainers can copy exercises';
  END IF;

  -- Copy the exercise
  INSERT INTO exercises (
    name,
    description,
    muscle_groups,
    equipment,
    difficulty,
    video_url,
    trainer_id
  )
  SELECT 
    name || ' (копия)',
    description,
    muscle_groups,
    equipment,
    difficulty,
    video_url,
    v_trainer_id
  FROM exercises
  WHERE id = exercise_id
  RETURNING id INTO v_new_exercise_id;

  RETURN v_new_exercise_id;
END;
$$;