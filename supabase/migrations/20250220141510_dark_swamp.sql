-- Drop existing policies
DROP POLICY IF EXISTS "trainer_view_clients" ON clients;
DROP POLICY IF EXISTS "client_view_own_profile" ON clients;
DROP POLICY IF EXISTS "client_registration" ON clients;

-- Reset RLS
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for clients table
CREATE POLICY "allow_registration"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow any authenticated user to insert

CREATE POLICY "trainer_view_all"
ON clients
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_view_own"
ON clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Create view for client profiles
DROP VIEW IF EXISTS client_profiles;

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