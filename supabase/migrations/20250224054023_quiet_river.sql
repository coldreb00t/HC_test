-- Drop existing policies
DROP POLICY IF EXISTS "trainers_view_photos" ON storage.objects;
DROP POLICY IF EXISTS "clients_view_own_photos" ON storage.objects;
DROP POLICY IF EXISTS "clients_upload_own_photos" ON storage.objects;
DROP POLICY IF EXISTS "clients_delete_own_photos" ON storage.objects;

-- Drop helper function
DROP FUNCTION IF EXISTS storage.owns_photo;

-- Disable RLS on storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;