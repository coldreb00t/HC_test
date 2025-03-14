import { supabase } from '../api/supabase';
import errorHandler from '../utils/errorHandler';

// Интерфейс для тренера
export interface Trainer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  specialty?: string;
  bio?: string;
  experience?: number;
  avatar_url?: string;
  rating?: number;
  created_at: string;
}

/**
 * Получение профиля текущего тренера
 * @param userId ID пользователя
 */
export const getCurrentTrainerProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('trainers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка получения профиля',
    });
    return { data: null, error: appError };
  }
};

/**
 * Обновление профиля тренера
 * @param trainerId ID тренера
 * @param profileData Данные профиля для обновления
 */
export const updateTrainerProfile = async (trainerId: string, profileData: Partial<Trainer>) => {
  try {
    const { data, error } = await supabase
      .from('trainers')
      .update(profileData)
      .eq('id', trainerId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка обновления профиля',
      showToast: true,
    });
    return { data: null, error: appError };
  }
};

/**
 * Получение статистики тренера
 * @param trainerId ID тренера
 */
export const getTrainerStats = async (trainerId: string) => {
  try {
    // Получаем количество клиентов
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('trainer_id', trainerId);

    if (clientsError) {
      throw clientsError;
    }

    // Получаем количество активных тренировок
    const { data: workoutsData, error: workoutsError } = await supabase
      .from('workouts')
      .select('id')
      .eq('trainer_id', trainerId)
      .gt('date', new Date().toISOString().split('T')[0]);

    if (workoutsError) {
      throw workoutsError;
    }

    // Другие статистические данные могут быть добавлены здесь

    return {
      data: {
        clientsCount: clientsData.length,
        activeWorkoutsCount: workoutsData.length,
      },
      error: null,
    };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка получения статистики',
    });
    return {
      data: {
        clientsCount: 0,
        activeWorkoutsCount: 0,
      },
      error: appError,
    };
  }
};

/**
 * Получение последних клиентов тренера
 * @param trainerId ID тренера
 * @param limit Количество записей (по умолчанию 5)
 */
export const getRecentClients = async (trainerId: string, limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка получения клиентов',
    });
    return { data: null, error: appError };
  }
};

/**
 * Получение ближайших тренировок
 * @param trainerId ID тренера
 * @param limit Количество записей (по умолчанию 5)
 */
export const getUpcomingWorkouts = async (trainerId: string, limit = 5) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('workouts')
      .select('*, clients(*)')
      .eq('trainer_id', trainerId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка получения тренировок',
    });
    return { data: null, error: appError };
  }
};

/**
 * Загрузка фотографии профиля
 * @param trainerId ID тренера
 * @param fileUri URI файла фотографии
 * @param fileName Имя файла
 */
export const uploadProfilePhoto = async (trainerId: string, fileUri: string, fileName: string) => {
  try {
    const fileExt = fileName.split('.').pop();
    const filePath = `avatars/${trainerId}/${Date.now()}.${fileExt}`;

    const response = await fetch(fileUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('trainer_photos')
      .upload(filePath, blob);

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('trainer_photos')
      .getPublicUrl(filePath);

    // Обновляем профиль тренера с новым URL фотографии
    const { data: profileData, error: profileError } = await supabase
      .from('trainers')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', trainerId)
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    return { url: urlData.publicUrl, profile: profileData, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка загрузки фото',
      showToast: true,
    });
    return { url: null, profile: null, error: appError };
  }
};

export default {
  getCurrentTrainerProfile,
  updateTrainerProfile,
  getTrainerStats,
  getRecentClients,
  getUpcomingWorkouts,
  uploadProfilePhoto,
}; 