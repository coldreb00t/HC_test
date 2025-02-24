-- Drop existing policies
DROP POLICY IF EXISTS "universal_photos_access" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create separate policies for trainers and clients
CREATE POLICY "trainer_photos_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  AND auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  AND auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_photos_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  AND auth.jwt() ->> 'role' = 'client'
  AND (
    split_part(storage.filename(name), '-', 1) IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  AND auth.jwt() ->> 'role' = 'client'
  AND (
    split_part(storage.filename(name), '-', 1) IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  )
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;