/*
  # Fix workouts table relationships

  1. Changes
    - Drop and recreate workouts table with proper relationships
    - Add indexes for performance
    - Update RLS policies
    - Add test data

  2. Security
    - Enable RLS
    - Add policies for trainers and clients
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
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT workouts_end_time_check CHECK (end_time > start_time)
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
DO $$
DECLARE
  v_trainer_id uuid;
  v_client_id uuid;
BEGIN
  -- Get first trainer
  SELECT id INTO v_trainer_id
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'trainer'
  LIMIT 1;

  -- Get first client
  SELECT id INTO v_client_id
  FROM clients
  LIMIT 1;

  -- Insert workouts if we have both trainer and client
  IF v_trainer_id IS NOT NULL AND v_client_id IS NOT NULL THEN
    INSERT INTO workouts (client_id, trainer_id, start_time, end_time, title)
    VALUES 
      (
        v_client_id,
        v_trainer_id,
        (NOW()::date + '10:00'::time),
        (NOW()::date + '11:00'::time),
        'Персональная тренировка'
      ),
      (
        v_client_id,
        v_trainer_id,
        ((NOW() + interval '1 day')::date + '14:00'::time),
        ((NOW() + interval '1 day')::date + '15:00'::time),
        'Силовая тренировка'
      );
  END IF;
END $$;