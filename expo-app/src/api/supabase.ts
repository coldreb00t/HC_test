import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Получение URL и ключа Supabase из переменных окружения
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://your-supabase-url.supabase.co';
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey || 'your-supabase-anon-key';

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

export default {
  supabase,
  setClientSupabase,
}; 