-- Disable RLS on all tables
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE strength_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_view_programs" ON training_programs;
DROP POLICY IF EXISTS "allow_trainer_manage_programs" ON training_programs;
DROP POLICY IF EXISTS "allow_view_program_exercises" ON program_exercises;
DROP POLICY IF EXISTS "allow_trainer_manage_program_exercises" ON program_exercises;
DROP POLICY IF EXISTS "allow_view_client_programs" ON client_programs;
DROP POLICY IF EXISTS "allow_trainer_manage_client_programs" ON client_programs;
DROP POLICY IF EXISTS "allow_view_strength_exercises" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_manage_strength" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_insert_strength" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_update_strength" ON strength_exercises;
DROP POLICY IF EXISTS "allow_trainer_delete_strength" ON strength_exercises;
DROP POLICY IF EXISTS "allow_all_access_strength_exercises" ON strength_exercises;
DROP POLICY IF EXISTS "trainer_view_clients" ON clients;
DROP POLICY IF EXISTS "client_view_own_profile" ON clients;
DROP POLICY IF EXISTS "client_registration" ON clients;
DROP POLICY IF EXISTS "trainer_manage_workouts" ON workouts;
DROP POLICY IF EXISTS "client_view_workouts" ON workouts;
DROP POLICY IF EXISTS "allow_view_exercise_sets" ON exercise_sets;
DROP POLICY IF EXISTS "allow_trainer_manage_exercise_sets" ON exercise_sets;