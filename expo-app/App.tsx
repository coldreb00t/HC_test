import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import Toast from 'react-native-toast-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

// Контекст и провайдеры
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Навигация
import AppNavigation from './src/navigation/AppNavigation';

// Утилиты
import { setClientSupabase } from './src/api/supabase';
import { prepareApp } from './src/utils/appSetup';

// Игнорирование предупреждений
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
  'Non-serializable values were found in the navigation state.',
]);

// Предотвращаем автоматическое скрытие сплеш-скрина
SplashScreen.preventAutoHideAsync();

// Оборачивание навигации с поддержкой темы
const ThemedNavigationContainer = ({ children }: { children: React.ReactNode }) => {
  const { colors, isDarkMode } = useTheme();
  
  return (
    <NavigationContainer
      theme={{
        dark: isDarkMode,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.notification,
        },
      }}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {children}
    </NavigationContainer>
  );
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Загрузка шрифтов - используем единый набор для всего приложения
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
    // Добавляем шрифты из AppNavigation для совместимости со старым кодом
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
  });

  // Подготовка приложения - инициализация Supabase, загрузка необходимых данных
  useEffect(() => {
    async function prepare() {
      try {
        // Инициализация Supabase
        const supabaseInitialized = await setClientSupabase();
        
        if (!supabaseInitialized) {
          console.warn('Не удалось инициализировать Supabase');
        }
        
        // Выполнение других задач по подготовке приложения
        await prepareApp();
      } catch (e) {
        console.warn('Ошибка при подготовке приложения:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Скрытие сплеш-скрина после загрузки
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <ThemeProvider>
        <AuthProvider>
          <ThemedNavigationContainer>
            <AppNavigation />
          </ThemedNavigationContainer>
        </AuthProvider>
        <Toast />
      </ThemeProvider>
    </SafeAreaProvider>
  );
} 