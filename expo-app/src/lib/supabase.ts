import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Инициализация конфигурации Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Ошибка: Отсутствуют переменные окружения Supabase');
}

// Создаем клиент Supabase с использованием AsyncStorage для хранения сессии
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Вспомогательная функция для сохранения токенов в AsyncStorage
export const saveAuthTokens = async (access_token: string, refresh_token: string, email: string, rememberMe: boolean) => {
  try {
    await AsyncStorage.setItem('hardcase_auth_token', access_token);
    await AsyncStorage.setItem('hardcase_refresh_token', refresh_token);
    await AsyncStorage.setItem('hardcase_user_email', email);
    await AsyncStorage.setItem('hardcase_remember_me', rememberMe ? 'true' : 'false');
  } catch (error) {
    console.error('Ошибка сохранения токенов:', error);
  }
};

// Вспомогательная функция для удаления токенов из AsyncStorage при выходе
export const clearAuthTokens = async () => {
  try {
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

// Типы данных для таблиц базы данных
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

// Функции для работы с API

// Функции для работы с клиентами
export const getClientProfile = async (userId: string) => {
  return supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .single();
};

// Функции для работы с тренерами
export const getTrainerProfile = async (userId: string) => {
  return supabase
    .from('trainers')
    .select('*')
    .eq('user_id', userId)
    .single();
};

// Функции для работы с тренировками
export const getClientWorkouts = async (clientId: string) => {
  return supabase
    .from('workouts')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: true });
};

export const getWorkoutDetails = async (workoutId: string) => {
  return supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();
};

export const getWorkoutExercises = async (workoutId: string) => {
  return supabase
    .from('workout_exercises')
    .select('*')
    .eq('workout_id', workoutId)
    .order('order', { ascending: true });
};

export const getExerciseSets = async (exerciseId: string) => {
  return supabase
    .from('workout_sets')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('set_number', { ascending: true });
};

// Функция для обновления статуса упражнения
export const updateSetStatus = async (setId: string, completed: boolean) => {
  return supabase
    .from('workout_sets')
    .update({ completed })
    .eq('id', setId);
};

// Функция для обновления заметок к упражнению
export const updateExerciseNotes = async (exerciseId: string, notes: string) => {
  return supabase
    .from('workout_exercises')
    .update({ notes })
    .eq('id', exerciseId);
}; 