/*
  # Add sample exercises

  1. New Data
    - Add sample exercises to the exercises table
    - Include various exercises for different muscle groups
    - Include equipment types and difficulty levels

  2. Changes
    - Insert sample exercises with trainer_id NULL to make them available to all trainers
*/

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
  ),
  (
    'Разведение гантелей лежа',
    'Изолированное упражнение для грудных мышц.',
    ARRAY['chest'],
    ARRAY['dumbbells', 'bench'],
    'beginner'
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
  );