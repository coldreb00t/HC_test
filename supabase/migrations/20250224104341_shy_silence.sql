-- Drop existing policies
DROP POLICY IF EXISTS "allow_trainer_photos_access" ON storage.objects;
DROP POLICY IF EXISTS "allow_client_photos_access" ON storage.objects;

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

-- Create a single policy for all authenticated users
CREATE POLICY "allow_authenticated_photos_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos')
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;