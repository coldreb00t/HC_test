/*
  # Add meals tracking

  1. New Tables
    - `client_meals`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `date` (timestamptz)
      - `meal_type` (text) - breakfast, lunch, dinner, snack
      - `photo_url` (text)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for trainers and clients
*/

-- Create meals table
CREATE TABLE IF NOT EXISTS client_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  date timestamptz DEFAULT now(),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_meals ENABLE ROW LEVEL SECURITY;

-- Policies for meals
CREATE POLICY "trainers_view_meals"
  ON client_meals
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer'
  );

CREATE POLICY "clients_manage_own_meals"
  ON client_meals
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