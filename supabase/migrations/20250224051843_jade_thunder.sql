-- Create storage bucket for client photos if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'client-photos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('client-photos', 'client-photos', true);
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "allow_authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload photos
CREATE POLICY "allow_authenticated_uploads"
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] = 'progress-photos'
    OR (storage.foldername(name))[1] = 'measurements-photos'
  )
);

-- Allow authenticated users to view photos
CREATE POLICY "allow_authenticated_select"
ON storage.objects FOR SELECT TO authenticated 
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] = 'progress-photos'
    OR (storage.foldername(name))[1] = 'measurements-photos'
  )
);

-- Allow users to update their own photos
CREATE POLICY "allow_authenticated_update"
ON storage.objects FOR UPDATE TO authenticated 
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] = 'progress-photos'
    OR (storage.foldername(name))[1] = 'measurements-photos'
  )
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] = 'progress-photos'
    OR (storage.foldername(name))[1] = 'measurements-photos'
  )
);

-- Allow users to delete their own photos
CREATE POLICY "allow_authenticated_delete"
ON storage.objects FOR DELETE TO authenticated 
USING (
  bucket_id = 'client-photos'
  AND (
    (storage.foldername(name))[1] = 'progress-photos'
    OR (storage.foldername(name))[1] = 'measurements-photos'
  )
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;