/*
  # Fix client profiles view

  1. Changes
    - Drop and recreate client_profiles view
    - Simplify view structure
    - Add proper access control

  2. Security
    - Maintain RLS through view conditions
    - Only show appropriate data to trainers and clients
*/

-- Drop view if exists
DROP VIEW IF EXISTS client_profiles;

-- Create simplified view for client profiles
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
  ) as next_workout
FROM clients c
WHERE 
  -- Show all clients to trainers, but only own profile to clients
  (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'trainer'
  ))
  OR
  c.user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON client_profiles TO authenticated;