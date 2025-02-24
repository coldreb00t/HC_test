-- Drop existing policies
DROP POLICY IF EXISTS "allow_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;

-- Disable RLS on storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Grant ALL permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- Grant additional permissions that might be needed
GRANT SELECT ON storage.buckets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;