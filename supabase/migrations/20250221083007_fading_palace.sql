-- Drop the view that depends on program_exercises
DROP VIEW IF EXISTS client_profiles;

-- Create set_details table
CREATE TABLE set_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_exercise_id uuid NOT NULL REFERENCES program_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  reps text NOT NULL,
  weight text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_exercise_id, set_number)
);

-- Enable RLS
ALTER TABLE set_details ENABLE ROW LEVEL SECURITY;

-- Create policies for set_details
CREATE POLICY "trainer_manage_sets"
ON set_details
FOR ALL
TO authenticated
USING (is_trainer())
WITH CHECK (is_trainer());

CREATE POLICY "client_view_sets"
ON set_details
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM program_exercises pe
    JOIN training_programs tp ON tp.id = pe.program_id
    JOIN client_programs cp ON cp.program_id = tp.id
    JOIN clients c ON c.id = cp.client_id
    WHERE pe.id = set_details.program_exercise_id
    AND c.user_id = auth.uid()
  )
);

-- Modify program_exercises table
ALTER TABLE program_exercises 
  DROP COLUMN IF EXISTS sets,
  DROP COLUMN IF EXISTS reps,
  DROP COLUMN IF EXISTS weight;

-- Recreate the view with updated schema
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
                  'muscle_groups', e.muscle_groups,
                  'equipment', e.equipment,
                  'difficulty', e.difficulty,
                  'sets', (
                    SELECT COALESCE(
                      json_agg(
                        json_build_object(
                          'set_number', sd.set_number,
                          'reps', sd.reps,
                          'weight', sd.weight
                        ) ORDER BY sd.set_number
                      ),
                      '[]'::json
                    )
                    FROM set_details sd
                    WHERE sd.program_exercise_id = pe.id
                  ),
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