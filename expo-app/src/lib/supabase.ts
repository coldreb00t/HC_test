/**
 * ВНИМАНИЕ: Этот файл является устаревшим и сохранен только для обратной совместимости.
 * Пожалуйста, используйте импорт из 'src/api/supabase.ts' вместо этого файла.
 */

import { 
  supabase, 
  setClientSupabase,
  Client,
  Trainer,
  Workout,
  Exercise,
  WorkoutExercise,
  WorkoutSet,
  ProgressRecord
} from '../api/supabase';

// Реэкспорт основного клиента и функций
export { 
  supabase, 
  setClientSupabase,
  Client,
  Trainer,
  Workout,
  Exercise,
  WorkoutExercise,
  WorkoutSet,
  ProgressRecord
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