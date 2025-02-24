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

-- Disable RLS on storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- Update bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'client-photos';