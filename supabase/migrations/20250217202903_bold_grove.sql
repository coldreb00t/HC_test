/*
  # Add insert policy for clients table

  1. Changes
    - Add policy allowing users to create their own client profile
    - Policy ensures user can only create a profile with their own user_id

  2. Security
    - Users can only create one profile for themselves
    - Prevents users from creating profiles for other users
*/

-- Add policy for inserting new client profiles
CREATE POLICY "Users can create their own client profile"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);