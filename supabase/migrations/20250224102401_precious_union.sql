-- Drop existing policies
DROP POLICY IF EXISTS "allow_photo_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_photo_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_photo_delete" ON storage.objects;

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

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for storage access
CREATE POLICY "allow_photo_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] = 'progress-photos'
);

CREATE POLICY "allow_photo_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] = 'progress-photos'
);

CREATE POLICY "allow_photo_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] = 'progress-photos'
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;