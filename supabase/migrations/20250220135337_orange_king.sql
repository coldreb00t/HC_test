-- Drop existing view
DROP VIEW IF EXISTS client_profiles;

-- Drop existing table
DROP TABLE IF EXISTS clients CASCADE;

-- Create clients table with proper foreign key
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  photo_url text,
  subscription_status text DEFAULT 'inactive',
  subscription_end_date timestamptz,
  
  -- Measurements
  weight numeric(5,2),
  height numeric(5,2),
  chest numeric(5,2),
  waist numeric(5,2),
  hips numeric(5,2),
  biceps numeric(5,2),
  body_fat_percentage numeric(4,1),
  
  -- Activity tracking
  steps_count integer,
  sleep_hours numeric(3,1),
  water_ml integer,
  mood text,
  stress_level integer CHECK (stress_level BETWEEN 1 AND 5),
  
  -- Metadata
  notes text,
  last_measurement_date timestamptz,
  last_activity_update timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Add unique constraint to ensure one profile per user
  CONSTRAINT clients_user_id_key UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX clients_user_id_idx ON clients(user_id);
CREATE INDEX clients_subscription_status_idx ON clients(subscription_status);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "trainer_view_clients"
ON clients
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "trainer_manage_clients"
ON clients
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_view_own_profile"
ON clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY "client_update_own_profile"
ON clients
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "client_registration"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'client'
  AND user_id = auth.uid()
);

-- Create view for client profiles
CREATE VIEW client_profiles AS
SELECT 
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  get_auth_user_email(c.user_id) as email,
  c.phone,
  c.subscription_status,
  c.weight,
  c.height,
  c.chest,
  c.waist,
  c.hips,
  c.biceps,
  c.body_fat_percentage,
  c.steps_count,
  c.sleep_hours,
  c.water_ml,
  c.mood,
  c.stress_level,
  c.last_measurement_date,
  c.last_activity_update,
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
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id', tp.id,
          'title', tp.title,
          'description', tp.description,
          'created_at', tp.created_at,
          'status', cp.status,
          'exercises', (
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  'id', e.id,
                  'name', e.name,
                  'sets', pe.sets,
                  'reps', pe.reps,
                  'intensity', pe.intensity,
                  'weight', pe.weight,
                  'exercise_order', pe.exercise_order
                ) ORDER BY pe.exercise_order
              ),
              '[]'::json
            )
            FROM program_exercises pe
            JOIN exercises e ON e.id = pe.exercise_id
            WHERE pe.program_id = tp.id
          )
        ) ORDER BY cp.created_at DESC
      ),
      '[]'::json
    )
    FROM client_programs cp
    JOIN training_programs tp ON tp.id = cp.program_id
    WHERE cp.client_id = c.id
  ) as programs
FROM clients c
WHERE 
  (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'trainer'
  ))
  OR
  c.user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON client_profiles TO authenticated;