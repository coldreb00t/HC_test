import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import AuthStack from './AuthStack';
import ClientStack from './ClientStack';
import TrainerStack from './TrainerStack';
import UserTypeScreen from '../screens/auth/UserTypeScreen';
import { Theme } from '../styles/theme';
import { navigationRef } from './rootNavigation';

// Тип для root стека
type RootStackParamList = {
  [ROUTES.ROOT.AUTH]: undefined;
  [ROUTES.ROOT.CLIENT]: undefined;
  [ROUTES.ROOT.TRAINER]: undefined;
  [ROUTES.ROOT.USER_TYPE]: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Настройки SplashScreen
SplashScreen.preventAutoHideAsync().catch(() => {
  /* prevent splash screen from auto hiding */
});

const AppNavigation = () => {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  
  // Загрузка шрифтов
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  });
  
  // Эффект для скрытия SplashScreen после загрузки шрифтов
  useEffect(() => {
    const hideSplashScreen = async () => {
      // Дожидаемся загрузки шрифтов и инициализации аутентификации
      if (fontsLoaded && !isLoading) {
        // Добавляем небольшую задержку для плавности
        await new Promise(resolve => setTimeout(resolve, 300));
        await SplashScreen.hideAsync();
      }
    };
    
    hideSplashScreen();
  }, [fontsLoaded, isLoading]);

  // Показываем загрузочный экран, пока загружаются шрифты
  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  // Определяем, какой стек показывать в зависимости от состояния аутентификации
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={Theme.colors.background}
        translucent={false}
      />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animationEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        {!isAuthenticated ? (
          // Если пользователь не аутентифицирован, показываем стек авторизации
          <Stack.Screen name={ROUTES.ROOT.AUTH} component={AuthStack} />
        ) : userRole === null ? (
          // Если пользователь аутентифицирован, но роль не определена, показываем экран выбора роли
          <Stack.Screen name={ROUTES.ROOT.USER_TYPE} component={UserTypeScreen} />
        ) : userRole === 'client' ? (
          // Если пользователь - клиент, показываем стек клиента
          <Stack.Screen name={ROUTES.ROOT.CLIENT} component={ClientStack} />
        ) : (
          // Если пользователь - тренер, показываем стек тренера
          <Stack.Screen name={ROUTES.ROOT.TRAINER} component={TrainerStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
});

export default AppNavigation; 