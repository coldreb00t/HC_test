-- Disable RLS on all tables
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE strength_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_nutrition DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE
  _tbl text;
  _pol text;
BEGIN
  FOR _tbl, _pol IN (
    SELECT schemaname || '.' || tablename, policyname
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', _pol, _tbl);
  END LOOP;
END $$;

-- Grant full permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant read access to anonymous users for storage
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;
GRANT USAGE ON SCHEMA storage TO anon;