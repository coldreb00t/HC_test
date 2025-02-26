-- Add training_program_id column to workouts table
ALTER TABLE workouts
ADD COLUMN training_program_id uuid REFERENCES training_programs(id);

-- Create index for better performance
CREATE INDEX workouts_training_program_id_idx ON workouts(training_program_id);