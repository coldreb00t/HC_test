-- Drop existing policies
DROP POLICY IF EXISTS "allow_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for storage access
CREATE POLICY "allow_trainer_view_photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  )
  AND auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "allow_client_view_own_photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  )
  AND (
    -- Extract client ID from filename (format: client_id-timestamp-uuid.ext)
    split_part(storage.filename(name), '-', 1) IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "allow_client_upload_own_photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  )
  AND auth.jwt() ->> 'role' = 'client'
  AND (
    -- Extract client ID from filename (format: client_id-timestamp-uuid.ext)
    split_part(storage.filename(name), '-', 1) IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "allow_client_delete_own_photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  )
  AND (
    -- Extract client ID from filename (format: client_id-timestamp-uuid.ext)
    split_part(storage.filename(name), '-', 1) IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  )
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;