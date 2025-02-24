/*
  # Add activity reports table

  1. New Tables
    - `client_activity_reports`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `date` (timestamptz)
      - `steps_count` (integer)
      - `sleep_hours` (numeric)
      - `water_ml` (integer)
      - `mood` (text)
      - `stress_level` (integer)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for trainers and clients
*/

-- Create activity reports table
CREATE TABLE IF NOT EXISTS client_activity_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  date timestamptz DEFAULT now(),
  steps_count integer,
  sleep_hours numeric(3,1),
  water_ml integer,
  mood text CHECK (mood IN ('great', 'good', 'neutral', 'bad', 'terrible')),
  stress_level integer CHECK (stress_level BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_activity_reports ENABLE ROW LEVEL SECURITY;

-- Policies for activity reports
CREATE POLICY "trainers_view_activity_reports"
  ON client_activity_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "clients_manage_own_activity_reports"
  ON client_activity_reports
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- Update client_profiles view to include latest activity report
DROP VIEW IF EXISTS client_profiles;

CREATE VIEW client_profiles AS
SELECT 
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  get_auth_user_email(c.user_id) as email,
  c.phone,
  c.photo_url,
  c.subscription_status,
  c.subscription_end_date,
  c.created_at,
  (
    SELECT json_build_object(
      'id', w.id,
      'start_time', w.start_time,
      'title', w.title
    )
    FROM workouts w
    WHERE w.client_id = c.id
    AND w.start_time > CURRENT_TIMESTAMP
    ORDER BY w.start_time
    LIMIT 1
  ) as next_workout,
  (
    SELECT json_build_object(
      'id', cp.id,
      'program_title', tp.title,
      'progress', cp.progress
    )
    FROM client_programs cp
    JOIN training_programs tp ON tp.id = cp.program_id
    WHERE cp.client_id = c.id
    AND cp.status = 'active'
    ORDER BY cp.start_date DESC
    LIMIT 1
  ) as current_program,
  (
    SELECT row_to_json(m.*)
    FROM client_measurements m
    WHERE m.client_id = c.id
    ORDER BY m.date DESC
    LIMIT 1
  ) as latest_measurements,
  (
    SELECT row_to_json(ar.*)
    FROM client_activity_reports ar
    WHERE ar.client_id = c.id
    ORDER BY ar.date DESC
    LIMIT 1
  ) as latest_activity_report
FROM clients c
WHERE 
  (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role')::text = 'trainer'
  ))
  OR
  c.user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON client_profiles TO authenticated;