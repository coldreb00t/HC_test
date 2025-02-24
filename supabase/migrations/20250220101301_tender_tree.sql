/*
  # Add test data for workouts

  1. Test Data
    - Add sample workouts for testing calendar view
    - Link workouts to existing clients
    - Set realistic dates and times
*/

-- Insert test workouts
INSERT INTO workouts (client_id, trainer_id, start_time, end_time, title)
SELECT 
  c.id as client_id,
  (
    SELECT id 
    FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'trainer' 
    LIMIT 1
  ) as trainer_id,
  -- Today at 10:00
  (NOW()::date + '10:00'::time) as start_time,
  -- Today at 11:00
  (NOW()::date + '11:00'::time) as end_time,
  'Персональная тренировка' as title
FROM clients c
LIMIT 1;

-- Insert another workout for tomorrow
INSERT INTO workouts (client_id, trainer_id, start_time, end_time, title)
SELECT 
  c.id as client_id,
  (
    SELECT id 
    FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'trainer' 
    LIMIT 1
  ) as trainer_id,
  -- Tomorrow at 14:00
  ((NOW() + interval '1 day')::date + '14:00'::time) as start_time,
  -- Tomorrow at 15:00
  ((NOW() + interval '1 day')::date + '15:00'::time) as end_time,
  'Силовая тренировка' as title
FROM clients c
LIMIT 1;