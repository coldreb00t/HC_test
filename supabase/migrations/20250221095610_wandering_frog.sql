-- Create strength exercises table
CREATE TABLE strength_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text NOT NULL,
  video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX strength_exercises_trainer_id_idx ON strength_exercises(trainer_id);
CREATE INDEX strength_exercises_name_idx ON strength_exercises(name);

-- Enable RLS
ALTER TABLE strength_exercises ENABLE ROW LEVEL SECURITY;

-- Create policies
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