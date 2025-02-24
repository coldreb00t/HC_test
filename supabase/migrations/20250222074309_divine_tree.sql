-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

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