-- Drop existing table if exists
DROP TABLE IF EXISTS client_nutrition CASCADE;

-- Create client nutrition table
CREATE TABLE client_nutrition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date date NOT NULL,
  proteins integer NOT NULL CHECK (proteins >= 0),
  fats integer NOT NULL CHECK (fats >= 0),
  carbs integer NOT NULL CHECK (carbs >= 0),
  water numeric(4,1) NOT NULL CHECK (water >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, date)
);

-- Enable RLS
ALTER TABLE client_nutrition ENABLE ROW LEVEL SECURITY;

-- Create policies for client_nutrition
CREATE POLICY "allow_trainer_view_nutrition"
ON client_nutrition
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "allow_client_manage_nutrition"
ON client_nutrition
FOR ALL
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);

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
CREATE POLICY "allow_trainer_photos_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos', 'nutrition-photos')
  AND auth.jwt() ->> 'role' = 'trainer'
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos', 'nutrition-photos')
  AND auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "allow_client_photos_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos', 'nutrition-photos')
  AND (
    split_part(storage.filename(name), '/', 2) IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] IN ('progress-photos', 'measurements-photos', 'nutrition-photos')
  AND (
    split_part(storage.filename(name), '/', 2) IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  )
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;