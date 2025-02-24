-- Drop existing tables to ensure clean state
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Create clients table with proper foreign key
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  photo_url text,
  subscription_status text DEFAULT 'inactive',
  subscription_end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT clients_user_id_key UNIQUE (user_id)
);

-- Create workouts table with proper relationships
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES auth.users(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  title text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT workouts_end_time_check CHECK (end_time > start_time)
);

-- Create indexes
CREATE INDEX clients_user_id_idx ON clients(user_id);
CREATE INDEX clients_subscription_status_idx ON clients(subscription_status);
CREATE INDEX workouts_client_id_idx ON workouts(client_id);
CREATE INDEX workouts_trainer_id_idx ON workouts(trainer_id);
CREATE INDEX workouts_start_time_idx ON workouts(start_time);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "trainer_view_clients"
ON clients
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
);

CREATE POLICY "client_view_own_profile"
ON clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY "client_registration"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'client'
  AND user_id = auth.uid()
);

-- Create RLS policies for workouts
CREATE POLICY "trainer_manage_workouts"
ON workouts
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'trainer'
  AND trainer_id = auth.uid()
);

CREATE POLICY "client_view_workouts"
ON workouts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE user_id = auth.uid()
  )
);