import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { LogBox } from 'react-native';
import * as Sentry from '@sentry/react-native';

/**
 * Игнорирование предупреждений, которые не влияют на функциональность
 */
export const setupLogIgnore = () => {
  LogBox.ignoreLogs([
    'Sending `onAnimatedValueUpdate` with no listeners registered.',
    'Non-serializable values were found in the navigation state.',
    'Require cycle:',
    'Setting a timer for a long period',
    'The action "NAVIGATE"',
    'NativeBase:',
    '[Reanimated]',
  ]);
};

/**
 * Получение информации об устройстве пользователя
 */
export const getDeviceInfo = async () => {
  const deviceInfo = {
    deviceName: Device.deviceName || 'Unknown',
    deviceType: Device.deviceType || 0,
    osName: Device.osName || 'Unknown',
    osVersion: Device.osVersion || 'Unknown',
    manufacturer: await Device.getManufacturerAsync() || 'Unknown',
    brand: Device.brand || 'Unknown',
    modelName: Device.modelName || 'Unknown',
    platform: Platform.OS,
    appVersion: Constants.manifest?.version || '1.0.0',
  };

  return deviceInfo;
};

/**
 * Проверка подключения к интернету
 */
export const checkNetworkConnection = async () => {
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected || false,
    type: state.type,
    isInternetReachable: state.isInternetReachable,
  };
};

/**
 * Утилита для подготовки приложения перед запуском
 * Выполняет первоначальную настройку и инициализацию компонентов
 */

// Инициализация Sentry для отслеживания ошибок
const initSentry = () => {
  if (Constants.expoConfig?.extra?.sentryDsn) {
    Sentry.init({
      dsn: Constants.expoConfig.extra.sentryDsn,
      enableAutoSessionTracking: true,
      tracesSampleRate: 1.0,
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
    });
    return true;
  }
  return false;
};

// Загрузка последних настроек пользователя
const loadUserPreferences = async () => {
  try {
    const themePreference = await AsyncStorage.getItem('userThemePreference');
    const notificationSettings = await AsyncStorage.getItem('notificationSettings');
    
    // Здесь можно инициализировать глобальное состояние на основе этих настроек
    
    return {
      themePreference: themePreference ? JSON.parse(themePreference) : null,
      notificationSettings: notificationSettings ? JSON.parse(notificationSettings) : null,
    };
  } catch (error) {
    console.warn('Ошибка при загрузке настроек пользователя:', error);
    return {
      themePreference: null,
      notificationSettings: null,
    };
  }
};

// Основная функция подготовки приложения
export const prepareApp = async () => {
  try {
    // Инициализация Sentry
    const sentryInitialized = initSentry();
    console.log('Sentry инициализирован:', sentryInitialized);
    
    // Загрузка настроек пользователя
    const userPreferences = await loadUserPreferences();
    console.log('Настройки пользователя загружены');
    
    // Другие действия по подготовке приложения
    // Например, проверка доступности сервера, загрузка начальных данных и т.д.
    
    return true;
  } catch (error) {
    console.error('Ошибка при подготовке приложения:', error);
    // Отправляем ошибку в Sentry, если он инициализирован
    Sentry.captureException(error);
    return false;
  }
}; 