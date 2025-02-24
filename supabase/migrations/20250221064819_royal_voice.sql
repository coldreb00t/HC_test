-- Add more free weight exercises and cardio exercises
INSERT INTO exercises (name, description, muscle_groups, equipment, difficulty) VALUES
  -- Compound Free Weight Exercises
  (
    'Тяга штанги к поясу',
    'Базовое упражнение для спины. Выполняется в наклоне с прямой спиной.',
    ARRAY['back', 'biceps', 'core'],
    ARRAY['barbell'],
    'intermediate'
  ),
  (
    'Жим гантелей стоя',
    'Базовое упражнение для плеч. Выполняется стоя с гантелями.',
    ARRAY['shoulders', 'triceps'],
    ARRAY['dumbbells'],
    'intermediate'
  ),
  (
    'Румынская тяга',
    'Вариация становой тяги с акцентом на заднюю поверхность бедра.',
    ARRAY['back', 'glutes', 'hamstrings'],
    ARRAY['barbell'],
    'intermediate'
  ),
  (
    'Французский жим',
    'Изолированное упражнение для трицепса с гантелью или штангой.',
    ARRAY['triceps'],
    ARRAY['dumbbells', 'barbell'],
    'beginner'
  ),
  (
    'Подъем гантелей на бицепс',
    'Классическое упражнение для бицепса.',
    ARRAY['biceps', 'forearms'],
    ARRAY['dumbbells'],
    'beginner'
  ),
  (
    'Тяга гантелей в наклоне',
    'Упражнение для спины с акцентом на верхнюю часть.',
    ARRAY['back', 'shoulders', 'biceps'],
    ARRAY['dumbbells'],
    'beginner'
  ),
  (
    'Болгарские выпады',
    'Односторонние приседания с опорой на заднюю ногу.',
    ARRAY['legs', 'glutes'],
    ARRAY['dumbbells'],
    'intermediate'
  ),
  (
    'Жим гантелей лежа',
    'Вариация жима лежа с гантелями.',
    ARRAY['chest', 'shoulders', 'triceps'],
    ARRAY['dumbbells', 'bench'],
    'intermediate'
  ),
  (
    'Махи гантелями в стороны',
    'Изолированное упражнение для средней дельты.',
    ARRAY['shoulders'],
    ARRAY['dumbbells'],
    'beginner'
  ),
  (
    'Подъем штанги на бицепс',
    'Классическое упражнение для бицепса со штангой.',
    ARRAY['biceps', 'forearms'],
    ARRAY['barbell'],
    'intermediate'
  ),
  
  -- Cardio Exercises
  (
    'Бег на беговой дорожке',
    'Кардио упражнение для развития выносливости и сжигания калорий.',
    ARRAY['legs', 'core'],
    ARRAY['machine'],
    'beginner'
  ),
  (
    'Велотренажер',
    'Низкоударное кардио упражнение для ног и сердечно-сосудистой системы.',
    ARRAY['legs'],
    ARRAY['machine'],
    'beginner'
  ),
  (
    'Эллиптический тренажер',
    'Комплексное кардио упражнение с низкой нагрузкой на суставы.',
    ARRAY['legs', 'arms', 'core'],
    ARRAY['machine'],
    'beginner'
  ),
  (
    'Гребной тренажер',
    'Кардио упражнение с вовлечением всего тела.',
    ARRAY['back', 'legs', 'arms', 'core'],
    ARRAY['machine'],
    'intermediate'
  ),
  (
    'Прыжки со скакалкой',
    'Интенсивное кардио упражнение для развития координации и выносливости.',
    ARRAY['legs', 'core'],
    ARRAY['bodyweight'],
    'intermediate'
  ),
  (
    'Берпи',
    'Комплексное упражнение, сочетающее силовую и кардио нагрузку.',
    ARRAY['chest', 'legs', 'core'],
    ARRAY['bodyweight'],
    'advanced'
  ),
  (
    'Интервальный бег',
    'Чередование быстрого и медленного бега для развития выносливости.',
    ARRAY['legs'],
    ARRAY['bodyweight'],
    'intermediate'
  ),
  (
    'Степпер',
    'Кардио упражнение с имитацией подъема по лестнице.',
    ARRAY['legs', 'glutes'],
    ARRAY['machine'],
    'beginner'
  ),
  (
    'Кроссфит кардио',
    'Высокоинтенсивная круговая тренировка с разными упражнениями.',
    ARRAY['legs', 'core', 'chest', 'back'],
    ARRAY['bodyweight'],
    'advanced'
  ),
  (
    'Плавание',
    'Низкоударное кардио упражнение для всего тела.',
    ARRAY['legs', 'back', 'chest', 'core'],
    ARRAY['bodyweight'],
    'intermediate'
  );