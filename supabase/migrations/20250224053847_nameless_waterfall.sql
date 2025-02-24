-- Drop existing policies
DROP POLICY IF EXISTS "allow_authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create function to check if user owns photo
CREATE OR REPLACE FUNCTION storage.owns_photo(object_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  client_id text;
BEGIN
  -- Extract client ID from filename (format: client_id-timestamp-uuid.ext)
  client_id := split_part(storage.filename(object_name), '-', 1);
  
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.clients c ON c.user_id = u.id
    WHERE u.id = auth.uid()
    AND c.id = client_id::uuid
  );
END;
$$;

-- Allow trainers to view all photos
CREATE POLICY "trainers_view_photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] = 'progress-photos'
    OR (storage.foldername(name))[1] = 'measurements-photos'
  )
  AND auth.jwt() ->> 'role' = 'trainer'
);

-- Allow clients to view their own photos
CREATE POLICY "clients_view_own_photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] = 'progress-photos'
    OR (storage.foldername(name))[1] = 'measurements-photos'
  )
  AND auth.jwt() ->> 'role' = 'client'
  AND storage.owns_photo(name)
);

-- Allow clients to upload their own photos
CREATE POLICY "clients_upload_own_photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] = 'progress-photos'
    OR (storage.foldername(name))[1] = 'measurements-photos'
  )
  AND auth.jwt() ->> 'role' = 'client'
  AND storage.owns_photo(name)
);

-- Allow clients to delete their own photos
CREATE POLICY "clients_delete_own_photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] = 'progress-photos'
    OR (storage.foldername(name))[1] = 'measurements-photos'
  )
  AND auth.jwt() ->> 'role' = 'client'
  AND storage.owns_photo(name)
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;