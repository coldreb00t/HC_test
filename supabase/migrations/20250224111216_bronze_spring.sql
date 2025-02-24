-- Drop existing view
DROP VIEW IF EXISTS client_profiles;

-- Create updated view for client profiles
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
          'id', cn.id,
          'date', cn.date,
          'proteins', cn.proteins,
          'fats', cn.fats,
          'carbs', cn.carbs,
          'water', cn.water,
          'photos', (
            SELECT COALESCE(
              array_agg(obj.name),
              ARRAY[]::text[]
            )
            FROM storage.objects obj
            WHERE obj.bucket_id = 'client-photos'
            AND obj.name LIKE 'nutrition-photos/' || c.id::text || '/' || cn.date::text || '/%'
          )
        ) ORDER BY cn.date DESC
      ),
      '[]'::json
    )
    FROM client_nutrition cn
    WHERE cn.client_id = c.id
  ) as nutrition
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