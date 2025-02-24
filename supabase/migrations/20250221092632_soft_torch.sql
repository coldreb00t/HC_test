-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_exercises" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_insert" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_update" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_delete" ON exercises;

-- Reset RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Clear all existing exercises
TRUNCATE TABLE exercises CASCADE;

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
  AND trainer_id = auth.uid()
);

CREATE POLICY "allow_trainer_update"
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

CREATE POLICY "allow_trainer_delete"
ON exercises
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

-- Insert new sample exercises
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
  ),
  (
    'Тяга штанги в наклоне',
    'Базовое упражнение для спины.',
    ARRAY['back', 'biceps'],
    ARRAY['barbell'],
    'intermediate'
  ),
  (
    'Жим гантелей сидя',
    'Базовое упражнение для плеч.',
    ARRAY['shoulders', 'triceps'],
    ARRAY['dumbbells'],
    'intermediate'
  ),
  (
    'Выпады с гантелями',
    'Упражнение для ног с акцентом на одну ногу.',
    ARRAY['legs', 'glutes'],
    ARRAY['dumbbells'],
    'intermediate'
  ),
  (
    'Скручивания на пресс',
    'Базовое упражнение для пресса.',
    ARRAY['core'],
    ARRAY['bodyweight'],
    'beginner'
  ),
  (
    'Тяга верхнего блока',
    'Упражнение для спины на тренажере.',
    ARRAY['back', 'biceps'],
    ARRAY['machine'],
    'beginner'
  );