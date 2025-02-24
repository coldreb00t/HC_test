/*
  # Create workouts and clients tables

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `first_name` (text)
      - `last_name` (text)
      - `created_at` (timestamp)
    
    - `workouts`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `trainer_id` (uuid, references auth.users)
      - `start_time` (timestamp with time zone)
      - `end_time` (timestamp with time zone)
      - `title` (text)
      - `notes` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for trainers to manage their workouts
    - Add policies for clients to view their workouts
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES auth.users(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  title text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Policies for clients table
CREATE POLICY "Trainers can view all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'trainer');

CREATE POLICY "Clients can view own profile"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for workouts table
CREATE POLICY "Trainers can manage their workouts"
  ON workouts
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'trainer' 
    AND trainer_id = auth.uid()
  );

CREATE POLICY "Clients can view their workouts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );