import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Получение URL и ключа Supabase из переменных окружения
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://example.supabase.co';
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example';

console.log('Supabase URL:', supabaseUrl);
console.log('Using test credentials:', supabaseUrl.includes('example'));

// Создание клиента Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Функция для инициализации Supabase клиента
 * Используется при запуске приложения
 */
export const setClientSupabase = async (): Promise<boolean> => {
  try {
    // Для тестовых данных просто возвращаем true
    if (supabaseUrl.includes('example')) {
      console.log('Используются тестовые данные Supabase. Пропускаем проверку соединения.');
      return true;
    }
    
    // Проверка соединения с Supabase
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Ошибка инициализации Supabase:', error.message);
      return false;
    }
    
    // Подписка на обновления авторизации
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
    });
    
    return true;
  } catch (error) {
    console.error('Критическая ошибка при инициализации Supabase:', error);
    return false;
  }
};

// Экспортируем типы данных
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

export default {
  supabase,
  setClientSupabase,
}; 