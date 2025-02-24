-- Drop existing policies
DROP POLICY IF EXISTS "trainer_photos_access" ON storage.objects;
DROP POLICY IF EXISTS "client_photos_access" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create a single policy for universal photo access
CREATE POLICY "universal_photos_access"
ON storage.objects
FOR ALL
TO anon, authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
);

-- Grant necessary permissions
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;
GRANT USAGE ON SCHEMA storage TO anon;