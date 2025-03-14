import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { supabase } from '../api/supabase';
import { useTheme } from './ThemeContext';

// Типы данных
export type UserType = 'client' | 'trainer' | null;

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
          
          // Загружаем сохраненный тип пользователя
          const savedUserType = await AsyncStorage.getItem('@hardcase_user_type');
          if (savedUserType) {
            setUserTypeState(savedUserType as UserType);
          } else {
            // Если не сохранен, определим тип по данным пользователя
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
            await AsyncStorage.removeItem('@hardcase_user_type');
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

  // Определение типа пользователя (клиент или тренер) по ID пользователя
  const determineUserType = async (userId: string) => {
    try {
      // Проверяем, существует ли запись о пользователе как о тренере
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (trainerData && !trainerError) {
        setUserTypeState('trainer');
        await AsyncStorage.setItem('@hardcase_user_type', 'trainer');
        return;
      }

      // Проверяем, существует ли запись о пользователе как о клиенте
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (clientData && !clientError) {
        setUserTypeState('client');
        await AsyncStorage.setItem('@hardcase_user_type', 'client');
        return;
      }

      // Если не нашли ни клиента, ни тренера, то тип не определен
      setUserTypeState(null);
      await AsyncStorage.removeItem('@hardcase_user_type');
    } catch (error) {
      console.error('Ошибка при определении типа пользователя:', error);
      setUserTypeState(null);
    }
  };

  // Сохранение типа пользователя
  const setUserType = async (type: UserType) => {
    setUserTypeState(type);
    if (type) {
      await AsyncStorage.setItem('@hardcase_user_type', type);
    } else {
      await AsyncStorage.removeItem('@hardcase_user_type');
    }
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
      
      // Регистрируем пользователя
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Ошибка регистрации',
          text2: error.message,
          visibilityTime: 4000,
        });
        return { error };
      }

      if (data.user) {
        // Создаем запись в базе данных в зависимости от типа пользователя
        if (userData.userType === 'trainer') {
          const { error: trainerError } = await supabase
            .from('trainers')
            .insert([
              {
                user_id: data.user.id,
                first_name: userData.firstName,
                last_name: userData.lastName,
                email: userData.email,
                phone: userData.phone,
                specialty: userData.specialty || '',
                bio: userData.bio || '',
              },
            ]);

          if (trainerError) {
            Toast.show({
              type: 'error',
              text1: 'Ошибка создания профиля',
              text2: trainerError.message,
              visibilityTime: 4000,
            });
            return { error: trainerError };
          }

          await setUserType('trainer');
        } else if (userData.userType === 'client') {
          const { error: clientError } = await supabase
            .from('clients')
            .insert([
              {
                user_id: data.user.id,
                first_name: userData.firstName,
                last_name: userData.lastName,
                email: userData.email,
                phone: userData.phone,
                trainer_id: userData.trainerId || null,
              },
            ]);

          if (clientError) {
            Toast.show({
              type: 'error',
              text1: 'Ошибка создания профиля',
              text2: clientError.message,
              visibilityTime: 4000,
            });
            return { error: clientError };
          }

          await setUserType('client');
        }

        Toast.show({
          type: 'success',
          text1: 'Успешно',
          text2: 'Регистрация выполнена успешно',
          visibilityTime: 2000,
        });
      }

      return { user: data.user };
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
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserTypeState(null);
      await AsyncStorage.removeItem('@hardcase_user_type');
      
      Toast.show({
        type: 'success',
        text1: 'Выход выполнен',
        text2: 'Вы успешно вышли из системы',
        visibilityTime: 2000,
      });
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
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'exp://127.0.0.1:19000/--/reset-password',
      });

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Ошибка сброса пароля',
          text2: error.message,
          visibilityTime: 4000,
        });
        return { error };
      }

      Toast.show({
        type: 'success',
        text1: 'Успешно',
        text2: 'Инструкция по сбросу пароля отправлена на вашу почту',
        visibilityTime: 4000,
      });

      return { data };
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
      
      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Ошибка обновления пароля',
          text2: error.message,
          visibilityTime: 4000,
        });
        return { error };
      }

      Toast.show({
        type: 'success',
        text1: 'Успешно',
        text2: 'Пароль успешно обновлен',
        visibilityTime: 2000,
      });

      return { data };
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