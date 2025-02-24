/*
  # Fix workouts table and relationships

  1. Drop and recreate workouts table with proper constraints
  2. Reset RLS
  3. Create policies
  4. Insert test data
*/

-- Drop existing table if exists
DROP TABLE IF EXISTS workouts CASCADE;

-- Create workouts table with proper constraints
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES auth.users(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  title text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
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
SELECT 
  c.id as client_id,
  u.id as trainer_id,
  (NOW()::date + '10:00'::time) as start_time,
  (NOW()::date + '11:00'::time) as end_time,
  'Персональная тренировка' as title
FROM clients c
CROSS JOIN auth.users u
WHERE u.raw_user_meta_data->>'role' = 'trainer'
LIMIT 1;