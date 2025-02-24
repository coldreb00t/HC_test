-- Drop existing policies
DROP POLICY IF EXISTS "allow_view_strength_exercises" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_insert_strength" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_update_strength" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_delete_strength" ON strength_exercises;

-- Disable RLS
ALTER TABLE strength_exercises DISABLE ROW LEVEL SECURITY;