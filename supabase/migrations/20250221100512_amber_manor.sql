-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_strength_exercises" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_manage_strength" ON strength_exercises;

-- Reset RLS
ALTER TABLE strength_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE strength_exercises ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for strength exercises
CREATE POLICY "allow_all_access_strength_exercises"
ON strength_exercises
FOR ALL
TO authenticated
USING (true)  -- Allow all authenticated users to view exercises
WITH CHECK (true);  -- Allow all authenticated users to manage exercises