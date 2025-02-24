/*
  # Fix Training Programs Implementation

  1. Changes
    - Simplify table structure
    - Fix RLS policies
    - Add proper constraints
    - Remove unnecessary complexity

  2. Tables Modified
    - training_programs
    - program_exercises
*/

-- Drop existing tables and start fresh
DROP TABLE IF EXISTS program_exercises CASCADE;
DROP TABLE IF EXISTS training_programs CASCADE;

-- Create training_programs table
CREATE TABLE training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create program_exercises table
CREATE TABLE program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sets integer NOT NULL,
  reps text NOT NULL,
  intensity text NOT NULL,
  exercise_order integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, exercise_order)
);

-- Enable RLS
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for training_programs
CREATE POLICY "trainers_manage_own_programs" 
ON training_programs 
FOR ALL 
TO authenticated
USING (
  trainer_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'trainer'
  )
)
WITH CHECK (
  trainer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'trainer'
  )
);

-- Simple RLS policies for program_exercises
CREATE POLICY "trainers_manage_program_exercises" 
ON program_exercises 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM training_programs
    WHERE id = program_exercises.program_id
    AND trainer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'trainer'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM training_programs
    WHERE id = program_exercises.program_id
    AND trainer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'trainer'
    )
  )
);