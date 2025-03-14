// Типы данных для таблиц базы данных

// Тип клиента
export interface Client {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
  trainer_id?: string;
  created_at: string;
}

// Тип тренера
export interface Trainer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
  specialty?: string;
  bio?: string;
  created_at: string;
}

// Тип тренировки
export interface Workout {
  id: string;
  name: string;
  description?: string;
  trainer_id: string;
  client_id: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  exercises?: WorkoutExercise[];
  total_sets?: number;
  completed_sets?: number;
}

// Тип упражнения
export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category?: string;
  exercise_type?: string;
  muscle_group?: string;
  equipment?: string;
  video_url?: string;
  image_url?: string;
}

// Тип упражнения в тренировке
export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order: number;
  sets: number;
  reps?: number;
  weight?: number;
  rest_time?: number;
  notes?: string;
  exercise?: Exercise;
  sets_data?: WorkoutSet[];
}

// Тип подхода упражнения
export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  completed: boolean;
  notes?: string;
}

// Тип записи о прогрессе
export interface ProgressRecord {
  id: string;
  client_id: string;
  date: string;
  weight?: number;
  body_fat_percentage?: number;
  notes?: string;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
}

// Тип фотографии прогресса
export interface ProgressPhoto {
  id: string;
  client_id: string;
  photo_url: string;
  date: string;
  type: 'front' | 'back' | 'side' | 'other';
  notes?: string;
}

// Тип достижения клиента
export interface ClientAchievement {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  date: string;
  image_url?: string;
}

// Тип статистики клиента
export interface ClientStatistics {
  totalWorkouts: number;
  completedWorkouts: number;
  canceledWorkouts: number;
  upcomingWorkouts: number;
} 