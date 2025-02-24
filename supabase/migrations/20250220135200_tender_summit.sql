-- Drop view if exists
DROP VIEW IF EXISTS client_profiles;

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