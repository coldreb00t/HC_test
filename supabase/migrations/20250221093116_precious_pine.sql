-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_exercises" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_insert" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_update" ON exercises;
DROP POLICY IF EXISTS "allow_trainer_delete" ON exercises;

-- Drop any views that might reference exercises
DROP VIEW IF EXISTS client_profiles;

-- Drop any foreign key constraints that reference exercises
ALTER TABLE program_exercises DROP CONSTRAINT IF EXISTS program_exercises_exercise_id_fkey;

-- Drop the exercises table and all dependent objects
DROP TABLE IF EXISTS exercises CASCADE;

-- Recreate the client_profiles view without exercises data
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
  ) as next_workout
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