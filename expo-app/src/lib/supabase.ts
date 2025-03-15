/**
 * ВНИМАНИЕ: Этот файл является устаревшим и сохранен только для обратной совместимости.
 * Пожалуйста, используйте импорт из 'src/api/supabase.ts' вместо этого файла.
 */

import { 
  supabase, 
  setClientSupabase
} from '../api/supabase';

// Определение типов данных
export interface Client {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
  trainer_id?: string;
}

export interface Trainer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
}

export interface Workout {
  id: string;
  name: string;
  trainer_id: string;
  client_id: string;
  date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category?: string;
  exercise_type?: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order: number;
  notes?: string;
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  completed: boolean;
}

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

// Реэкспорт основного клиента и функций
export { 
  supabase, 
  setClientSupabase
};

// Для обратной совместимости сохраняем старые функции
export const saveAuthTokens = async (access_token: string, refresh_token: string, email: string, rememberMe: boolean) => {
  console.warn('УСТАРЕВШАЯ ФУНКЦИЯ: saveAuthTokens в lib/supabase.ts, пожалуйста, используйте authService.ts');
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('hardcase_auth_token', access_token);
    await AsyncStorage.setItem('hardcase_refresh_token', refresh_token);
    await AsyncStorage.setItem('hardcase_user_email', email);
    await AsyncStorage.setItem('hardcase_remember_me', rememberMe ? 'true' : 'false');
  } catch (error) {
    console.error('Ошибка сохранения токенов:', error);
  }
};

export const clearAuthTokens = async () => {
  console.warn('УСТАРЕВШАЯ ФУНКЦИЯ: clearAuthTokens в lib/supabase.ts, пожалуйста, используйте authService.ts');
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.multiRemove([
      'hardcase_auth_token',
      'hardcase_refresh_token',
      'hardcase_user_email',
      'hardcase_remember_me'
    ]);
  } catch (error) {
    console.error('Ошибка удаления токенов:', error);
  }
};

export default {
  supabase,
  setClientSupabase,
  saveAuthTokens,
  clearAuthTokens
}; 