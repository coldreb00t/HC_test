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
  water numeric(3,1) NOT NULL CHECK (water >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, date)
);

-- Enable RLS
ALTER TABLE client_nutrition ENABLE ROW LEVEL SECURITY;

-- Create policies for client_nutrition
CREATE POLICY "trainer_view_nutrition"
ON client_nutrition
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_manage_nutrition"
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