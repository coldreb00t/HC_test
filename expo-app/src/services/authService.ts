import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import errorHandler, { ErrorType } from '../utils/errorHandler';

// Ключи для хранения данных
const AUTH_TOKEN_KEY = 'auth_token';
const USER_ROLE_KEY = 'user_role';
const USER_TYPE_KEY = '@hardcase_user_type';

export type UserRole = 'client' | 'trainer' | null;

// Типы пользователей
export type UserType = 'client' | 'trainer' | null;

// Интерфейс для результата аутентификации
export interface AuthResult {
  success: boolean;
  session?: Session | null;
  user?: User | null;
  error?: any;
  role?: UserRole;
  userType?: UserType;
}

// Вход пользователя по email и паролю
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Выполняем запрос на вход
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }

    // Если успешный вход, определяем тип пользователя
    let userType: UserType = null;
    
    if (data.user) {
      userType = await determineUserType(data.user.id);
    }

    // Сохраняем токен авторизации и роль
    if (data.session) {
      await storeAuthToken(data.session.refresh_token);
      await storeUserRole(userType as UserRole);
    }

    return {
      success: true,
      session: data.session,
      user: data.user,
      userType,
    };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка входа',
      showToast: true,
    });
    
    return {
      success: false,
      error: appError,
    };
  }
};

// Регистрация нового пользователя
export const signUp = async (
  email: string, 
  password: string, 
  userData: { 
    firstName: string; 
    lastName: string; 
    userType: UserType; 
    phone?: string;
    specialty?: string;
    bio?: string;
  }
): Promise<AuthResult> => {
  try {
    // Регистрируем пользователя
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      // Создаем запись в таблице в зависимости от типа пользователя
      if (userData.userType === 'trainer') {
        const { error: trainerError } = await supabase
          .from('trainers')
          .insert([
            {
              user_id: data.user.id,
              first_name: userData.firstName,
              last_name: userData.lastName,
              email: userData.email || email,
              phone: userData.phone || '',
              specialty: userData.specialty || '',
              bio: userData.bio || '',
            },
          ]);

        if (trainerError) {
          throw trainerError;
        }
      } else if (userData.userType === 'client') {
        const { error: clientError } = await supabase
          .from('clients')
          .insert([
            {
              user_id: data.user.id,
              first_name: userData.firstName,
              last_name: userData.lastName,
              email: userData.email || email,
              phone: userData.phone || '',
            },
          ]);

        if (clientError) {
          throw clientError;
        }
      }

      // Сохраняем токен и роль
      await storeAuthToken(data.session.refresh_token);
      await storeUserRole(userData.userType as UserRole);
    }

    return {
      success: true,
      session: data.session,
      user: data.user,
      userType: userData.userType,
    };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка регистрации',
      showToast: true,
    });
    
    return {
      success: false,
      error: appError,
    };
  }
};

// Выход пользователя
export const signOut = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }
    
    // Удаляем сохраненные данные
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ROLE_KEY);
    await clearUserType();
    
    return true;
  } catch (error) {
    await errorHandler.handleError(error, {
      toastTitle: 'Ошибка выхода',
      showToast: false,
    });
    
    return false;
  }
};

// Проверка текущей сессии
export const checkSession = async (): Promise<AuthResult> => {
  try {
    // Проверяем сессию в Supabase
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      throw error;
    }
    
    if (!data.session) {
      // Пробуем восстановить сессию из сохраненного токена
      const token = await getAuthToken();
      if (token) {
        // Пытаемся обновить сессию
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: token,
        });
        
        if (refreshError) {
          throw refreshError;
        }
        
        if (refreshData.session) {
          const userType = await determineUserType(refreshData.user?.id);
          return {
            success: true,
            session: refreshData.session,
            user: refreshData.user,
            userType,
          };
        }
      }
      
      // Если сессию нельзя восстановить
      return {
        success: false,
        session: null,
      };
    }
    
    // Если сессия активна, получаем тип пользователя
    let userType: UserType = null;
    
    if (data.session.user) {
      // Сначала пытаемся получить из хранилища
      userType = await getUserType();
      
      // Если не найдено, определяем по данным из БД
      if (!userType) {
        userType = await determineUserType(data.session.user.id);
      }
    }
    
    return {
      success: true,
      session: data.session,
      user: data.session.user,
      userType,
    };
  } catch (error) {
    // Если ошибка связана с сетью, не показываем уведомление
    const isNetworkError = errorHandler.getErrorType(error) === ErrorType.NETWORK;
    
    const appError = await errorHandler.handleError(error, {
      showToast: !isNetworkError,
      toastTitle: 'Ошибка авторизации',
    });
    
    return {
      success: false,
      error: appError,
    };
  }
};

// Восстановление пароля
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    // Отправляем запрос на восстановление пароля
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'exp://127.0.0.1:19000/--/reset-password',
    });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    await errorHandler.handleError(error, {
      toastTitle: 'Ошибка восстановления',
      customMessage: 'Не удалось отправить инструкции по восстановлению пароля',
      showToast: true,
    });
    
    return false;
  }
};

// Обновление пароля
export const updatePassword = async (newPassword: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    await errorHandler.handleError(error, {
      toastTitle: 'Ошибка обновления',
      customMessage: 'Не удалось обновить пароль',
      showToast: true,
    });
    
    return false;
  }
};

// Определение типа пользователя
export const determineUserType = async (userId: string): Promise<UserType> => {
  try {
    // Проверяем, существует ли запись о пользователе как о тренере
    const { data: trainerData, error: trainerError } = await supabase
      .from('trainers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (trainerData && !trainerError) {
      await saveUserType('trainer');
      return 'trainer';
    }

    // Проверяем, существует ли запись о пользователе как о клиенте
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (clientData && !clientError) {
      await saveUserType('client');
      return 'client';
    }

    // Если не найдены записи ни тренера, ни клиента
    await clearUserType();
    return null;
  } catch (error) {
    console.error('Ошибка при определении типа пользователя:', error);
    return null;
  }
};

// Функции для работы с безопасным хранилищем

// Сохранение токена
const storeAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing auth token:', error);
  }
};

// Получение токена
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

// Сохранение роли пользователя
const storeUserRole = async (role: UserRole): Promise<void> => {
  try {
    await SecureStore.setItemAsync(USER_ROLE_KEY, role || '');
  } catch (error) {
    console.error('Error storing user role:', error);
  }
};

// Получение роли пользователя
const getUserRole = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(USER_ROLE_KEY);
  } catch (error) {
    console.error('Error retrieving user role:', error);
    return null;
  }
};

// Сохранение типа пользователя в AsyncStorage
export const saveUserType = async (userType: UserType): Promise<void> => {
  if (userType) {
    await AsyncStorage.setItem(USER_TYPE_KEY, userType);
  } else {
    await clearUserType();
  }
};

// Получение типа пользователя из AsyncStorage
export const getUserType = async (): Promise<UserType> => {
  try {
    const type = await AsyncStorage.getItem(USER_TYPE_KEY);
    return (type as UserType) || null;
  } catch (error) {
    console.error('Ошибка при получении типа пользователя:', error);
    return null;
  }
};

// Очистка типа пользователя из AsyncStorage
export const clearUserType = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_TYPE_KEY);
};

export default {
  signIn,
  signUp,
  signOut,
  checkSession,
  resetPassword,
  updatePassword,
  determineUserType,
  saveUserType,
  getUserType,
  clearUserType,
}; 