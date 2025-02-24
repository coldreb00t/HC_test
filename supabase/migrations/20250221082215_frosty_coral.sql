-- Drop existing table if exists
DROP TABLE IF EXISTS exercises CASCADE;

-- Create exercises table with trainer_id
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  muscle_groups text[] NOT NULL,
  equipment text[] NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX exercises_name_idx ON exercises(name);
CREATE INDEX exercises_difficulty_idx ON exercises(difficulty);
CREATE INDEX exercises_trainer_id_idx ON exercises(trainer_id);

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Insert sample exercises (system exercises with null trainer_id)
INSERT INTO exercises (name, description, muscle_groups, equipment, difficulty, trainer_id) VALUES
  (
    'Приседания со штангой',
    'Базовое упражнение для ног. Штанга располагается на верхней части спины.',
    ARRAY['legs', 'glutes', 'core'],
    ARRAY['barbell'],
    'intermediate',
    NULL
  ),
  (
    'Жим штанги лежа',
    'Базовое упражнение для груди. Выполняется лежа на скамье.',
    ARRAY['chest', 'shoulders', 'triceps'],
    ARRAY['barbell', 'bench'],
    'intermediate',
    NULL
  ),
  (
    'Становая тяга',
    'Базовое упражнение для всего тела. Подъем штанги с пола.',
    ARRAY['back', 'legs', 'core'],
    ARRAY['barbell'],
    'advanced',
    NULL
  ),
  (
    'Отжимания от пола',
    'Базовое упражнение для верхней части тела.',
    ARRAY['chest', 'shoulders', 'triceps'],
    ARRAY['bodyweight'],
    'beginner',
    NULL
  ),
  (
    'Подтягивания',
    'Базовое упражнение для спины и бицепса.',
    ARRAY['back', 'biceps'],
    ARRAY['pull-up bar'],
    'intermediate',
    NULL
  );