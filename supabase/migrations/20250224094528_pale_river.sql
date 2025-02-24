-- Drop existing policies
DROP POLICY IF EXISTS "photos_access_policy" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_select" ON storage.objects;

-- Create simplified policy for universal photos access
CREATE POLICY "universal_photos_access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;