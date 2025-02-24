-- Drop existing policies
DROP POLICY IF EXISTS "trainer_photos_access" ON storage.objects;
DROP POLICY IF EXISTS "client_photos_access" ON storage.objects;

-- Disable RLS on storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- Grant read access to anonymous users
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;
GRANT USAGE ON SCHEMA storage TO anon;