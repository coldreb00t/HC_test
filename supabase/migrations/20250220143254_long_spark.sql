-- Drop existing policies
DROP POLICY IF EXISTS "trainer_access" ON workouts;
DROP POLICY IF EXISTS "client_view" ON workouts;

-- Reset RLS
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create a function to check trainer role
CREATE OR REPLACE FUNCTION is_trainer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'trainer'
  );
END;
$$;

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
JOIN clients c ON c.id = w.client_id
WHERE 
  is_trainer()
  OR
  c.user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON workout_details TO authenticated;

-- Create simplified policies for workouts table
CREATE POLICY "trainer_manage_workouts"
ON workouts
FOR ALL
TO authenticated
USING (is_trainer())
WITH CHECK (is_trainer());

CREATE POLICY "client_view_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);