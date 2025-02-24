-- Drop existing tables to fix the relationships
DROP TABLE IF EXISTS program_exercises CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;

-- Recreate exercises table
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  muscle_groups text[], -- ['chest', 'shoulders', etc.]
  equipment text[],    -- ['barbell', 'dumbbell', etc.]
  difficulty text,     -- 'beginner', 'intermediate', 'advanced'
  video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate program_exercises table with proper relationships
CREATE TABLE program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES training_programs(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  sets integer NOT NULL,
  reps text NOT NULL,           -- Can be "12" or "8-12" or "AMRAP"
  intensity text NOT NULL,      -- Can be percentage or RPE
  exercise_order integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for exercises
CREATE POLICY "trainer_access_exercises"
ON exercises
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_view_exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);

-- Create simplified policies for program_exercises
CREATE POLICY "trainer_access_program_exercises"
ON program_exercises
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_view_program_exercises"
ON program_exercises
FOR SELECT
TO authenticated
USING (true);

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
  );