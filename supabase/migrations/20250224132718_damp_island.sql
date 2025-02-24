-- Drop existing view
DROP VIEW IF EXISTS client_profiles;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS client_activities CASCADE;
DROP TABLE IF EXISTS client_daily_stats CASCADE;

-- Create client_activities table
CREATE TABLE client_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date date NOT NULL,
  activity_type text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create client_daily_stats table for daily aggregated data
CREATE TABLE client_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date date NOT NULL,
  sleep_hours numeric(3,1),
  water_ml integer,
  mood text CHECK (mood IN ('great', 'good', 'neutral', 'bad', 'terrible')),
  stress_level integer CHECK (stress_level BETWEEN 1 AND 10),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, date)
);

-- Enable RLS
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_daily_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for client_activities
CREATE POLICY "trainer_view_activities"
ON client_activities
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_manage_activities"
ON client_activities
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

-- Create policies for client_daily_stats
CREATE POLICY "trainer_view_stats"
ON client_daily_stats
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_manage_stats"
ON client_daily_stats
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

-- Create updated view
CREATE VIEW client_profiles AS
SELECT 
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  get_auth_user_email(c.user_id) as email,
  c.phone,
  c.subscription_status,
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
          'status', cp.status,
          'created_at', tp.created_at,
          'exercises', (
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  'id', pe.id,
                  'name', e.name,
                  'description', e.description,
                  'video_url', e.video_url,
                  'exercise_order', pe.exercise_order,
                  'notes', pe.notes,
                  'sets', (
                    SELECT COALESCE(
                      json_agg(
                        json_build_object(
                          'set_number', es.set_number,
                          'reps', es.reps,
                          'weight', es.weight
                        ) ORDER BY es.set_number
                      ),
                      '[]'::json
                    )
                    FROM exercise_sets es
                    WHERE es.program_exercise_id = pe.id
                  )
                ) ORDER BY pe.exercise_order
              ),
              '[]'::json
            )
            FROM program_exercises pe
            JOIN strength_exercises e ON e.id = pe.exercise_id
            WHERE pe.program_id = tp.id
          )
        ) ORDER BY cp.created_at DESC
      ),
      '[]'::json
    )
    FROM client_programs cp
    JOIN training_programs tp ON tp.id = cp.program_id
    WHERE cp.client_id = c.id
  ) as programs,
  (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'date', ds.date,
          'sleep_hours', ds.sleep_hours,
          'water_ml', ds.water_ml,
          'mood', ds.mood,
          'stress_level', ds.stress_level,
          'notes', ds.notes,
          'activities', (
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  'id', ca.id,
                  'activity_type', ca.activity_type,
                  'duration_minutes', ca.duration_minutes
                ) ORDER BY ca.created_at
              ),
              '[]'::json
            )
            FROM client_activities ca
            WHERE ca.client_id = c.id
            AND ca.date = ds.date
          )
        ) ORDER BY ds.date DESC
      ),
      '[]'::json
    )
    FROM client_daily_stats ds
    WHERE ds.client_id = c.id
  ) as daily_stats
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