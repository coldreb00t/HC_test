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

-- Insert test data for development
INSERT INTO clients (user_id, first_name, last_name, phone, subscription_status)
SELECT 
  id as user_id,
  'John' as first_name,
  'Doe' as last_name,
  '+7 (999) 123-45-67' as phone,
  'active' as subscription_status
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'client'
AND NOT EXISTS (
  SELECT 1 FROM clients WHERE user_id = auth.users.id
)
LIMIT 1;