-- Drop existing table if exists
DROP TABLE IF EXISTS exercises CASCADE;

-- Create exercises table
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "allow_view_exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view exercises

CREATE POLICY "allow_trainer_manage"
ON exercises
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

-- Insert sample exercises
INSERT INTO exercises (name, description, muscle_groups, equipment, difficulty) VALUES
  (
    'Приседания со штангой',
    'Базовое упражнение для ног. Штанга располагается на верхней части спины.',
    ARRAY['legs', 'glutes', 'core'],
    ARRAY['barbell'],
    'intermediate'
  ),
  (
    'Жим штанги лежа',
    'Базовое упражнение для груди. Выполняется лежа на скамье.',
    ARRAY['chest', 'shoulders', 'triceps'],
    ARRAY['barbell', 'bench'],
    'intermediate'
  ),
  (
    'Становая тяга',
    'Базовое упражнение для всего тела. Подъем штанги с пола.',
    ARRAY['back', 'legs', 'core'],
    ARRAY['barbell'],
    'advanced'
  ),
  (
    'Отжимания от пола',
    'Базовое упражнение для верхней части тела.',
    ARRAY['chest', 'shoulders', 'triceps'],
    ARRAY['bodyweight'],
    'beginner'
  ),
  (
    'Подтягивания',
    'Базовое упражнение для спины и бицепса.',
    ARRAY['back', 'biceps'],
    ARRAY['pull-up bar'],
    'intermediate'
  );