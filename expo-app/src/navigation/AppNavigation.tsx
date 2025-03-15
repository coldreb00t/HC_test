import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { RootStackParamList } from '../types/navigation.types';
import AuthStack from './AuthStack';
import ClientStack from './ClientStack';
import TrainerStack from './TrainerStack';
import UserTypeScreen from '../screens/auth/UserTypeScreen';
import { useTheme } from '../context/ThemeContext';

// Настройки для корневого стека
const Stack = createStackNavigator<RootStackParamList>();

const AppNavigation = () => {
  const { isAuthenticated, userType, isLoading } = useAuth();
  const { colors } = useTheme();
  
  // Показываем загрузочный экран, пока идет проверка аутентификации
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Определяем, какой стек показывать в зависимости от состояния аутентификации
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animationEnabled: true,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      {!isAuthenticated ? (
        // Если пользователь не аутентифицирован, показываем стек авторизации
        <Stack.Screen name={ROUTES.ROOT.AUTH} component={AuthStack} />
      ) : userType === null ? (
        // Если пользователь аутентифицирован, но тип не определен, показываем экран выбора типа
        <Stack.Screen name={ROUTES.ROOT.USER_TYPE} component={UserTypeScreen} />
      ) : userType === 'client' ? (
        // Если пользователь - клиент, показываем стек клиента
        <Stack.Screen name={ROUTES.ROOT.CLIENT} component={ClientStack} />
      ) : (
        // Если пользователь - тренер, показываем стек тренера
        <Stack.Screen name={ROUTES.ROOT.TRAINER} component={TrainerStack} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigation; 