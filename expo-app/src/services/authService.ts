import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import errorHandler, { ErrorType } from '../utils/errorHandler';

// Ключи для хранения данных
const AUTH_TOKEN_KEY = 'auth_token';
const USER_ROLE_KEY = 'user_role';

export type UserRole = 'client' | 'trainer' | null;

// Интерфейс для результата аутентификации
export interface AuthResult {
  success: boolean;
  session?: Session | null;
  error?: any;
  role?: UserRole;
}

// Вход пользователя по email и паролю
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Выполняем запрос на вход
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Определяем роль пользователя
    const role = await determineUserRole(data.user?.id);
    
    // Сохраняем токен авторизации и роль
    if (data.session) {
      await storeAuthToken(data.session.refresh_token);
      await storeUserRole(role);
    }

    return {
      success: true,
      session: data.session,
      role,
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
    role: UserRole; 
    phone?: string;
  }
): Promise<AuthResult> => {
  try {
    // Регистрируем пользователя
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          phone: userData.phone || null,
        },
      },
    });

    if (error) {
      throw error;
    }

    // Если регистрация прошла успешно и не требуется подтверждение email
    if (data.session) {
      // В зависимости от роли, создаем запись в соответствующей таблице
      if (userData.role === 'client') {
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: data.user?.id,
            first_name: userData.firstName,
            last_name: userData.lastName,
            email: email,
            phone: userData.phone,
          });

        if (clientError) {
          throw clientError;
        }
      } else if (userData.role === 'trainer') {
        const { error: trainerError } = await supabase
          .from('trainers')
          .insert({
            user_id: data.user?.id,
            first_name: userData.firstName,
            last_name: userData.lastName,
            email: email,
            phone: userData.phone,
          });

        if (trainerError) {
          throw trainerError;
        }
      }

      // Сохраняем токен и роль
      await storeAuthToken(data.session.refresh_token);
      await storeUserRole(userData.role);
    }

    return {
      success: true,
      session: data.session,
      role: userData.role,
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
          const role = await determineUserRole(refreshData.user?.id);
          return {
            success: true,
            session: refreshData.session,
            role,
          };
        }
      }
      
      // Если сессию нельзя восстановить
      return {
        success: false,
        session: null,
      };
    }
    
    // Если сессия активна, определяем роль пользователя
    const role = await determineUserRole(data.session.user.id);
    
    return {
      success: true,
      session: data.session,
      role,
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
      redirectTo: 'hardcase://reset-password',
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

// Определение роли пользователя
export const determineUserRole = async (userId?: string): Promise<UserRole> => {
  if (!userId) {
    // Пытаемся получить роль из хранилища
    const storedRole = await getUserRole();
    if (storedRole) {
      return storedRole as UserRole;
    }
    return null;
  }
  
  try {
    // Проверяем, является ли пользователь клиентом
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (clientError) {
      throw clientError;
    }
    
    if (clientData) {
      await storeUserRole('client');
      return 'client';
    }
    
    // Проверяем, является ли пользователь тренером
    const { data: trainerData, error: trainerError } = await supabase
      .from('trainers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (trainerError) {
      throw trainerError;
    }
    
    if (trainerData) {
      await storeUserRole('trainer');
      return 'trainer';
    }
    
    return null;
  } catch (error) {
    await errorHandler.handleError(error, {
      showToast: false,
    });
    
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

export default {
  signIn,
  signUp,
  signOut,
  checkSession,
  resetPassword,
  updatePassword,
  determineUserRole,
}; 