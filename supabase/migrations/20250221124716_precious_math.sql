-- Create a view for workout details
CREATE OR REPLACE VIEW workout_details AS
SELECT 
  w.id,
  w.client_id,
  w.trainer_id,
  w.start_time,
  w.end_time,
  w.title,
  w.notes,
  c.first_name as client_first_name,
  c.last_name as client_last_name
FROM workouts w
JOIN clients c ON c.id = w.client_id;

-- Grant access to the view
GRANT SELECT ON workout_details TO authenticated;