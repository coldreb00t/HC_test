-- Drop existing policies
DROP POLICY IF EXISTS "allow_trainer_view_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_client_view_own_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_client_upload_own_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_client_delete_own_photos" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for storage access
CREATE POLICY "allow_authenticated_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  )
);

CREATE POLICY "allow_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  )
);

CREATE POLICY "allow_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  )
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;