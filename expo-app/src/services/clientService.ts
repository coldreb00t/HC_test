import { supabase } from '../api/supabase';
import errorHandler from '../utils/errorHandler';

// Интерфейс для клиента
export interface Client {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  avatar_url?: string;
  created_at: string;
}

// Интерфейс для прогресса клиента
export interface ProgressRecord {
  id: string;
  client_id: string;
  date: string;
  weight: number;
  body_fat_percentage?: number;
  photo_url?: string;
  notes?: string;
}

/**
 * Получение списка всех клиентов тренера
 * @param trainerId ID тренера
 */
export const getTrainerClients = async (trainerId: string) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('trainer_id', trainerId);

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
 * Получение данных конкретного клиента
 * @param clientId ID клиента
 */
export const getClientDetails = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка получения данных клиента',
    });
    return { data: null, error: appError };
  }
};

/**
 * Получение текущего профиля клиента
 * @param userId ID пользователя
 */
export const getCurrentClientProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('clients')
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
 * Обновление профиля клиента
 * @param clientId ID клиента
 * @param profileData Данные профиля для обновления
 */
export const updateClientProfile = async (clientId: string, profileData: Partial<Client>) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(profileData)
      .eq('id', clientId)
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
 * Получение записей прогресса клиента
 * @param clientId ID клиента
 */
export const getClientProgress = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('progress_records')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка получения прогресса',
    });
    return { data: null, error: appError };
  }
};

/**
 * Добавление новой записи прогресса
 * @param progressData Данные о прогрессе
 */
export const addProgressRecord = async (progressData: Omit<ProgressRecord, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('progress_records')
      .insert([progressData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка при добавлении прогресса',
      showToast: true,
    });
    return { data: null, error: appError };
  }
};

/**
 * Загрузка фотографии прогресса
 * @param clientId ID клиента
 * @param fileUri URI файла фотографии
 * @param fileName Имя файла
 */
export const uploadProgressPhoto = async (clientId: string, fileUri: string, fileName: string) => {
  try {
    const fileExt = fileName.split('.').pop();
    const filePath = `progress/${clientId}/${Date.now()}.${fileExt}`;

    const response = await fetch(fileUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('client_photos')
      .upload(filePath, blob);

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('client_photos')
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка загрузки фото',
      showToast: true,
    });
    return { url: null, error: appError };
  }
};

export default {
  getTrainerClients,
  getClientDetails,
  getCurrentClientProfile,
  updateClientProfile,
  getClientProgress,
  addProgressRecord,
  uploadProgressPhoto,
}; 