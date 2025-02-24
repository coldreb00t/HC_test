/*
  # Create secure access to client profiles with auth data

  1. New Functions
    - Create a function to safely access auth user data
  2. Views
    - Create a view for client profiles with email data
  3. Security
    - Function is accessible only to authenticated users
    - View is accessible only to authorized users
*/

-- Create a function to safely access auth user data
CREATE OR REPLACE FUNCTION get_auth_user_email(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the requesting user is a trainer
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role')::text = 'trainer'
  ) THEN
    -- Trainers can access any user's email
    RETURN (
      SELECT email
      FROM auth.users
      WHERE id = user_id
    );
  ELSE
    -- Non-trainers can only access their own email
    IF auth.uid() = user_id THEN
      RETURN (
        SELECT email
        FROM auth.users
        WHERE id = user_id
      );
    ELSE
      RETURN NULL;
    END IF;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_auth_user_email(uuid) TO authenticated;

-- Create a secure view for client profiles
CREATE OR REPLACE VIEW client_profiles AS
SELECT 
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  get_auth_user_email(c.user_id) as email,
  c.created_at
FROM clients c
WHERE 
  -- Only show profiles to trainers or the client themselves
  (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role')::text = 'trainer'
  ))
  OR
  c.user_id = auth.uid();

-- Grant access to the view for authenticated users
GRANT SELECT ON client_profiles TO authenticated;