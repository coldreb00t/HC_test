-- Drop existing view that depends on program_exercises
DROP VIEW IF EXISTS client_profiles;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS exercise_sets CASCADE;
DROP TABLE IF EXISTS program_exercises CASCADE;
DROP TABLE IF EXISTS training_programs CASCADE;
DROP TABLE IF EXISTS client_programs CASCADE;

-- Create training_programs table
CREATE TABLE training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create program_exercises table with proper columns
CREATE TABLE program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES strength_exercises(id) ON DELETE CASCADE,
  sets integer NOT NULL,
  reps text NOT NULL,
  weight text,
  exercise_order integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, exercise_order)
);

-- Create client_programs junction table
CREATE TABLE client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  progress numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, program_id)
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
                  'id', e.id,
                  'name', e.name,
                  'description', e.description,
                  'video_url', e.video_url,
                  'sets', pe.sets,
                  'reps', pe.reps,
                  'weight', pe.weight,
                  'exercise_order', pe.exercise_order,
                  'notes', pe.notes
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