/*
  # Program Builder Schema

  1. New Tables
    - `exercises`
      - Basic exercise information
      - Name, description, muscle groups, etc.
    
    - `program_exercises`
      - Links exercises to training programs
      - Includes sets, reps, and intensity details

  2. Security
    - Enable RLS on all tables
    - Trainers have full access
    - Clients have read-only access to assigned programs
*/

-- Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  muscle_groups text[], -- ['chest', 'shoulders', etc.]
  equipment text[],    -- ['barbell', 'dumbbell', etc.]
  difficulty text,     -- 'beginner', 'intermediate', 'advanced'
  video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create program_exercises table (for exercise instances in programs)
CREATE TABLE IF NOT EXISTS program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES training_programs(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  exercise_order integer NOT NULL,
  sets integer NOT NULL,
  reps text NOT NULL,           -- Can be "12" or "8-12" or "AMRAP"
  intensity text NOT NULL,      -- Can be percentage or RPE
  rest_time interval,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;

-- Policies for exercises
CREATE POLICY "trainers_full_access_exercises"
  ON exercises
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'trainer'
    AND trainer_id = auth.uid()
  );

CREATE POLICY "clients_view_program_exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT exercise_id 
      FROM program_exercises 
      WHERE program_id IN (
        SELECT program_id 
        FROM client_programs 
        WHERE client_id IN (
          SELECT id FROM clients 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Policies for program_exercises
CREATE POLICY "trainers_full_access_program_exercises"
  ON program_exercises
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "clients_view_own_program_exercises"
  ON program_exercises
  FOR SELECT
  TO authenticated
  USING (
    program_id IN (
      SELECT program_id 
      FROM client_programs 
      WHERE client_id IN (
        SELECT id FROM clients 
        WHERE user_id = auth.uid()
      )
    )
  );