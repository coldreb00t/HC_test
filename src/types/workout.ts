export interface ExerciseSet {
  set_number: number;
  reps: string;
  weight: string;
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  video_url?: string;
  sets: ExerciseSet[];
  notes?: string;
}

export interface Program {
  id: string;
  title: string;
  description?: string;
  exercises: Exercise[];
}

export interface Workout {
  id: string;
  start_time: string;
  title: string;
  training_program_id?: string;
  program?: Program | null;
} 