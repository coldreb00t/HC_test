-- Create storage bucket for client photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-photos', 'client-photos', true);

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'client-photos'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to view photos
CREATE POLICY "Authenticated users can view photos"
ON storage.objects FOR SELECT TO authenticated 
USING (
  bucket_id = 'client-photos'
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own photos
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE TO authenticated 
USING (
  bucket_id = 'client-photos'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE TO authenticated 
USING (
  bucket_id = 'client-photos'
  AND auth.role() = 'authenticated'
);