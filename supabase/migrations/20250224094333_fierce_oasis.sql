-- Drop existing policies
DROP POLICY IF EXISTS "allow_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has access to photo
CREATE OR REPLACE FUNCTION storage.has_photo_access(object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_id text;
  user_role text;
BEGIN
  -- Get user role from JWT
  user_role := auth.jwt() ->> 'role';
  
  -- Extract client ID from filename (format: client_id-timestamp-uuid.ext)
  client_id := split_part(storage.filename(object_name), '-', 1);
  
  -- Trainers can access all photos
  IF user_role = 'trainer' THEN
    RETURN true;
  END IF;
  
  -- Clients can only access their own photos
  IF user_role = 'client' THEN
    RETURN EXISTS (
      SELECT 1 FROM clients
      WHERE id::text = client_id
      AND user_id = auth.uid()
    );
  END IF;
  
  RETURN false;
END;
$$;

-- Create policies for storage access
CREATE POLICY "allow_photo_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  AND storage.has_photo_access(name)
);

CREATE POLICY "allow_photo_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  AND storage.has_photo_access(name)
);

CREATE POLICY "allow_photo_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
  AND storage.has_photo_access(name)
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;