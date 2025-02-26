-- Drop existing view first
DROP VIEW IF EXISTS workout_details;

-- Create a view to help with workout program details
CREATE VIEW workout_details AS
SELECT 
  w.id,
  w.client_id,
  w.trainer_id,
  w.start_time,
  w.end_time,
  w.title,
  w.notes,
  w.training_program_id,
  c.first_name as client_first_name,
  c.last_name as client_last_name,
  tp.title as program_title,
  tp.description as program_description,
  (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id', pe.id,
          'name', se.name,
          'description', se.description,
          'video_url', se.video_url,
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
    JOIN strength_exercises se ON se.id = pe.exercise_id
    WHERE pe.program_id = tp.id
  ) as exercises
FROM workouts w
LEFT JOIN clients c ON c.id = w.client_id
LEFT JOIN training_programs tp ON tp.id = w.training_program_id;

-- Grant access to the view
GRANT SELECT ON workout_details TO authenticated;