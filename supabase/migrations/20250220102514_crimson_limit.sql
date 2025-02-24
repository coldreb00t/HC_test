/*
  # Fix workouts table and policies

  1. Drop and recreate workouts table
  2. Add proper indexes
  3. Set up correct RLS policies
*/

-- Drop existing table if exists
DROP TABLE IF EXISTS workouts CASCADE;

-- Create workouts table
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

-- Create indexes for better performance
CREATE INDEX workouts_client_id_idx ON workouts(client_id);
CREATE INDEX workouts_trainer_id_idx ON workouts(trainer_id);
CREATE INDEX workouts_start_time_idx ON workouts(start_time);

-- Enable RLS
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create simplified RLS policies
CREATE POLICY "trainers_select_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainers_manage_workouts"
ON workouts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "trainers_update_workouts"
ON workouts
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

CREATE POLICY "trainers_delete_workouts"
ON workouts
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "clients_view_workouts"
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