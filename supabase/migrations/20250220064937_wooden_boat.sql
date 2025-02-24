/*
  # Fix RLS policies for training programs

  1. Changes
    - Drop existing policies for training_programs table
    - Create new, more permissive policies for trainers
    - Allow trainers to manage all training programs
    - Allow clients to view their assigned programs
  
  2. Security
    - Enable RLS on training_programs table
    - Add policies for SELECT, INSERT, UPDATE, DELETE operations
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Trainers can manage training programs" ON training_programs;
DROP POLICY IF EXISTS "Clients can view assigned programs" ON training_programs;

-- Reset RLS
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Create new policies for training_programs
CREATE POLICY "trainers_select_programs"
  ON training_programs
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow all authenticated users to view programs

CREATE POLICY "trainers_insert_programs"
  ON training_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "trainers_update_programs"
  ON training_programs
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "trainers_delete_programs"
  ON training_programs
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  );