import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Импорт компонентов авторизации
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import UserTypeScreen from '../screens/auth/UserTypeScreen';

// Импорт навигационных стеков
import ClientStack from './ClientStack';
import TrainerStack from './TrainerStack';

// Импорт типов навигации
import { RootStackParamList } from '../types/navigation.types';

// Импорт констант и сервисов
import { ROUTES } from '../constants/routes';
import { supabase } from '../lib/supabase';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigation = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<'client' | 'trainer' | null>(null);
  
  useEffect(() => {
    checkUser();
    
    // Подписываемся на изменения аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          const userType = await getUserType(session.user.id);
          setUserType(userType);
        } else {
          setUserType(null);
        }
        setLoading(false);
      }
    );
    
    return () => {
      // Очищаем подписки
      authListener?.subscription?.unsubscribe();
    };
  }, []);
  
  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const userType = await getUserType(user.id);
        setUserType(userType);
      }
    } catch (error) {
      console.error('Ошибка при проверке пользователя:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getUserType = async (userId: string): Promise<'client' | 'trainer' | null> => {
    try {
      // Проверяем, является ли пользователь клиентом
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (clientData) {
        return 'client';
      }
      
      // Проверяем, является ли пользователь тренером
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (trainerData) {
        return 'trainer';
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при определении типа пользователя:', error);
      return null;
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }
  
  // Функция для рендеринга стека аутентификации
  const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
  
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            // Аутентифицированные маршруты
            userType ? (
              // Маршруты в зависимости от типа пользователя
              userType === 'client' ? (
                <Stack.Screen name="Client" component={ClientStack} />
              ) : (
                <Stack.Screen name="Trainer" component={TrainerStack} />
              )
            ) : (
              // Если тип пользователя не определен, показываем экран выбора
              <Stack.Screen name="UserType" component={UserTypeScreen} />
            )
          ) : (
            // Маршруты для неаутентифицированных пользователей
            <Stack.Screen name="Auth" component={AuthStack} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});

export default AppNavigation; 