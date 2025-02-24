/*
  # Fix workouts data

  1. Drop existing policies
  2. Reset RLS
  3. Create new policies
  4. Add test data
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "trainer_view_workouts" ON workouts;
DROP POLICY IF EXISTS "trainer_manage_workouts" ON workouts;
DROP POLICY IF EXISTS "client_view_workouts" ON workouts;

-- Reset RLS
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create policies for workouts
CREATE POLICY "trainer_view_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainer_manage_workouts"
ON workouts
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "client_view_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);

-- Insert test data
WITH trainer AS (
  SELECT id 
  FROM auth.users 
  WHERE raw_user_meta_data->>'role' = 'trainer'
  LIMIT 1
),
client AS (
  SELECT id
  FROM clients
  LIMIT 1
)
INSERT INTO workouts (client_id, trainer_id, start_time, end_time, title)
VALUES 
  (
    (SELECT id FROM client),
    (SELECT id FROM trainer),
    (NOW()::date + '10:00'::time),
    (NOW()::date + '11:00'::time),
    'Персональная тренировка'
  ),
  (
    (SELECT id FROM client),
    (SELECT id FROM trainer),
    ((NOW() + interval '1 day')::date + '14:00'::time),
    ((NOW() + interval '1 day')::date + '15:00'::time),
    'Силовая тренировка'
  );