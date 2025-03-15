import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { supabase } from '../api/supabase';
import { useTheme } from './ThemeContext';
import authService, { UserType } from '../services/authService';

// Интерфейс контекста авторизации
export interface AuthContextType {
  user: User | null;
  userType: UserType;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any } | { user: User }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any } | { user: User }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: any } | { data: any }>;
  updatePassword: (password: string) => Promise<{ error: any } | { data: any }>;
  setUserType: (type: UserType) => Promise<void>;
}

// Создание контекста авторизации
export const AuthContext = createContext<AuthContextType>({
  user: null,
  userType: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => ({ error: 'Не реализовано' }),
  signUp: async () => ({ error: 'Не реализовано' }),
  signOut: async () => {},
  forgotPassword: async () => ({ error: 'Не реализовано' }),
  updatePassword: async () => ({ error: 'Не реализовано' }),
  setUserType: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserTypeState] = useState<UserType>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { colors } = useTheme();

  // Загрузка сессии пользователя при инициализации приложения
  useEffect(() => {
    const loadUserSession = async () => {
      try {
        // Получаем текущую сессию из Supabase
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          setUser(currentSession.user);
          
          // Используем authService для определения типа пользователя
          const userType = await authService.getUserType();
          if (userType) {
            setUserTypeState(userType);
          } else {
            // Если тип не сохранен, определяем его по данным из БД
            await determineUserType(currentSession.user.id);
          }
        }

        // Устанавливаем обработчик изменения авторизации
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log('Auth state changed:', event);
          
          setSession(newSession);
          setUser(newSession?.user || null);
          
          if (event === 'SIGNED_IN' && newSession?.user) {
            await determineUserType(newSession.user.id);
          } else if (event === 'SIGNED_OUT') {
            setUserTypeState(null);
            await authService.clearUserType();
          }
        });
        
        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Ошибка при загрузке сессии пользователя:', error);
        Toast.show({
          type: 'error',
          text1: 'Ошибка',
          text2: 'Не удалось загрузить данные пользователя',
          visibilityTime: 4000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserSession();
  }, []);

  // Определение типа пользователя с помощью authService
  const determineUserType = async (userId: string) => {
    try {
      // Используем метод из authService для определения типа пользователя
      const type = await authService.determineUserType(userId);
      
      // Устанавливаем тип пользователя в state и сохраняем в хранилище
      if (type) {
        setUserTypeState(type);
        await authService.saveUserType(type);
      }
      
      return type;
    } catch (error) {
      console.error('Ошибка определения типа пользователя:', error);
      return null;
    }
  };

  // Сохранение типа пользователя
  const setUserType = async (type: UserType) => {
    setUserTypeState(type);
    await authService.saveUserType(type);
  };

  // Вход в систему
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Ошибка входа',
          text2: error.message,
          visibilityTime: 4000,
        });
        return { error };
      }

      Toast.show({
        type: 'success',
        text1: 'Успешно',
        text2: 'Вход выполнен успешно',
        visibilityTime: 2000,
      });

      return { user: data.user };
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка входа',
        text2: error.message || 'Произошла неизвестная ошибка',
        visibilityTime: 4000,
      });
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  // Регистрация нового пользователя
  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setIsLoading(true);
      
      // Используем функцию из authService
      const result = await authService.signUp(email, password, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        userType: userData.userType,
        phone: userData.phone,
        specialty: userData.specialty,
        bio: userData.bio,
      });

      if (!result.success) {
        Toast.show({
          type: 'error',
          text1: 'Ошибка регистрации',
          text2: result.error?.message || 'Не удалось зарегистрироваться',
          visibilityTime: 4000,
        });
        return { error: result.error };
      }

      Toast.show({
        type: 'success',
        text1: 'Успешно',
        text2: 'Регистрация выполнена успешно',
        visibilityTime: 2000,
      });

      // Устанавливаем тип пользователя в состояние
      if (result.userType) {
        setUserTypeState(result.userType);
      }

      return { user: result.user || null };
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка регистрации',
        text2: error.message || 'Произошла неизвестная ошибка',
        visibilityTime: 4000,
      });
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  // Выход из системы
  const signOut = async () => {
    try {
      setIsLoading(true);
      const success = await authService.signOut();
      
      if (success) {
        setUser(null);
        setSession(null);
        setUserTypeState(null);
        
        Toast.show({
          type: 'success',
          text1: 'Выход выполнен',
          text2: 'Вы успешно вышли из системы',
          visibilityTime: 2000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Ошибка при выходе',
          text2: 'Не удалось выйти из системы',
          visibilityTime: 4000,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка при выходе',
        text2: error.message || 'Произошла неизвестная ошибка',
        visibilityTime: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Сброс пароля
  const forgotPassword = async (email: string) => {
    try {
      setIsLoading(true);
      
      const success = await authService.resetPassword(email);
      
      if (!success) {
        Toast.show({
          type: 'error',
          text1: 'Ошибка сброса пароля',
          text2: 'Не удалось отправить инструкции по сбросу пароля',
          visibilityTime: 4000,
        });
        return { error: 'Не удалось отправить инструкции по сбросу пароля' };
      }

      Toast.show({
        type: 'success',
        text1: 'Успешно',
        text2: 'Инструкция по сбросу пароля отправлена на вашу почту',
        visibilityTime: 4000,
      });

      return { data: 'success' };
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка сброса пароля',
        text2: error.message || 'Произошла неизвестная ошибка',
        visibilityTime: 4000,
      });
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  // Обновление пароля
  const updatePassword = async (password: string) => {
    try {
      setIsLoading(true);
      
      const success = await authService.updatePassword(password);
      
      if (!success) {
        Toast.show({
          type: 'error',
          text1: 'Ошибка обновления пароля',
          text2: 'Не удалось обновить пароль',
          visibilityTime: 4000,
        });
        return { error: 'Не удалось обновить пароль' };
      }

      Toast.show({
        type: 'success',
        text1: 'Успешно',
        text2: 'Пароль успешно обновлен',
        visibilityTime: 2000,
      });

      return { data: 'success' };
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка обновления пароля',
        text2: error.message || 'Произошла неизвестная ошибка',
        visibilityTime: 4000,
      });
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        session,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        forgotPassword,
        updatePassword,
        setUserType,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста авторизации
export const useAuth = () => useContext(AuthContext); 