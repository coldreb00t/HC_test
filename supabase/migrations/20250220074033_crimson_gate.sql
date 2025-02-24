/*
  # Create client_profiles view

  1. New View
    - Creates a view that combines client data with related information
    - Includes basic client info, next workout, and subscription status
  2. Security
    - Grants SELECT permission to authenticated users
*/

-- Drop the view if it exists
DROP VIEW IF EXISTS client_profiles;

-- Create the view
CREATE VIEW client_profiles AS
SELECT 
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.subscription_status,
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
  ) as next_workout
FROM clients c;

-- Grant access to the view
GRANT SELECT ON client_profiles TO authenticated;