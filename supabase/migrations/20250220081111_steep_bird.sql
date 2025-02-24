/*
  # Fix Trainer RLS Policies

  1. Changes
    - Simplify RLS policies for training programs
    - Fix trainer role verification
    - Add proper trainer_id checks
    - Ensure proper access control

  2. Security
    - Maintain proper access control
    - Ensure trainers can only manage their own programs
    - Allow clients to view assigned programs
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "trainer_manage_programs" ON training_programs;
DROP POLICY IF EXISTS "client_view_programs" ON training_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Add NOT NULL constraint to trainer_id if not already present
DO $$ 
BEGIN
  ALTER TABLE training_programs ALTER COLUMN trainer_id SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

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

-- Create a single policy for trainers that handles all operations
CREATE POLICY "trainer_manage_programs"
ON training_programs
FOR ALL
TO authenticated
USING (
  is_trainer()
)
WITH CHECK (
  is_trainer()
  AND trainer_id = auth.uid()
);

-- Create a policy for clients to view their assigned programs
CREATE POLICY "client_view_programs"
ON training_programs
FOR SELECT
TO authenticated
USING (
  NOT is_trainer()
  AND id IN (
    SELECT program_id 
    FROM client_programs 
    WHERE client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
);