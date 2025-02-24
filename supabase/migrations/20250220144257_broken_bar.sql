-- Create training programs table
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create program exercises table
CREATE TABLE IF NOT EXISTS program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets integer NOT NULL,
  reps text NOT NULL,
  weight text,
  notes text,
  exercise_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, exercise_order)
);

-- Create client programs junction table
CREATE TABLE IF NOT EXISTS client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  progress numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, program_id)
);

-- Enable RLS
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;

-- Create policies for training_programs
CREATE POLICY "trainer_manage_programs"
ON training_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

-- Create policies for program_exercises
CREATE POLICY "trainer_manage_exercises"
ON program_exercises
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM training_programs
    WHERE id = program_exercises.program_id
    AND trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM training_programs
    WHERE id = program_exercises.program_id
    AND trainer_id = auth.uid()
  )
);

-- Create policies for client_programs
CREATE POLICY "trainer_manage_assignments"
ON client_programs
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_view_assignments"
ON client_programs
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);