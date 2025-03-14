import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Sentry from 'sentry-expo';
import NetInfo from '@react-native-community/netinfo';

// Типы ошибок
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  SERVER = 'server',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

// Интерфейс для структурированных ошибок
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  code?: string;
}

// Функция для определения типа ошибки
export const getErrorType = (error: any): ErrorType => {
  // Ошибки сети
  if (!error) return ErrorType.UNKNOWN;

  if (error.message && (
    error.message.includes('network') ||
    error.message.includes('connection') ||
    error.message.includes('timeout') ||
    error.message.toLowerCase().includes('offline')
  )) {
    return ErrorType.NETWORK;
  }

  // Ошибки аутентификации Supabase
  if (error.status === 401 || error.status === 403 || 
      (error.code && (error.code === 'PGRST301' || error.code === 'PGRST302'))) {
    return ErrorType.AUTH;
  }

  // Ошибки на стороне сервера
  if (error.status && error.status >= 500) {
    return ErrorType.SERVER;
  }

  // Ошибки валидации
  if (error.status === 400 || 
      error.status === 422 || 
      error.message?.includes('validation')) {
    return ErrorType.VALIDATION;
  }

  // Неизвестные ошибки
  return ErrorType.UNKNOWN;
};

// Функция для получения понятного сообщения об ошибке
export const getErrorMessage = (error: any): string => {
  const errorType = getErrorType(error);

  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Проблема с интернет-соединением. Пожалуйста, проверьте подключение к сети.';
    case ErrorType.AUTH:
      if (error.message?.includes('email') || error.message?.includes('password')) {
        return 'Неверный email или пароль';
      }
      if (error.message?.includes('not allowed')) {
        return 'У вас нет доступа к этому ресурсу';
      }
      return 'Ошибка авторизации. Пожалуйста, войдите в систему снова.';
    case ErrorType.SERVER:
      return 'Проблема на сервере. Пожалуйста, попробуйте позже.';
    case ErrorType.VALIDATION:
      return error.message || 'Пожалуйста, проверьте правильность введенных данных.';
    case ErrorType.UNKNOWN:
    default:
      return error.message || 'Что-то пошло не так. Пожалуйста, попробуйте снова.';
  }
};

// Функция для отправки ошибки в систему мониторинга (Sentry)
export const logError = (error: any, extraContext?: Record<string, any>) => {
  if (__DEV__) {
    console.error('Error:', error);
    if (extraContext) {
      console.error('Context:', extraContext);
    }
  }

  // В production отправляем ошибки в Sentry
  if (!__DEV__) {
    try {
      Sentry.Native.captureException(error, {
        extra: extraContext,
      });
    } catch (sentryError) {
      console.error('Failed to log error to Sentry:', sentryError);
    }
  }
};

// Функция для обработки сетевых ошибок
export const handleNetworkError = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected || false;
};

// Основная функция для обработки ошибок
export const handleError = async (
  error: any,
  options?: {
    showToast?: boolean;
    toastTitle?: string;
    customMessage?: string;
    context?: Record<string, any>;
    onNetworkError?: () => void;
    onAuthError?: () => void;
  }
): Promise<AppError> => {
  const {
    showToast = true,
    toastTitle,
    customMessage,
    context,
    onNetworkError,
    onAuthError,
  } = options || {};

  // Проверяем подключение к сети при необходимости
  const errorType = getErrorType(error);
  if (errorType === ErrorType.NETWORK) {
    const isConnected = await handleNetworkError();
    if (!isConnected && onNetworkError) {
      onNetworkError();
    }
  }

  // Обрабатываем ошибки авторизации
  if (errorType === ErrorType.AUTH && onAuthError) {
    onAuthError();
  }

  // Логируем ошибку
  logError(error, context);

  // Создаем структурированную ошибку
  const appError: AppError = {
    type: errorType,
    message: customMessage || getErrorMessage(error),
    originalError: error,
    code: error.code,
  };

  // Показываем уведомление, если нужно
  if (showToast) {
    Toast.show({
      type: 'error',
      text1: toastTitle || 'Ошибка',
      text2: appError.message,
      position: 'bottom',
      visibilityTime: 4000,
    });
  }

  return appError;
};

// Хелпер для проверки типа ошибки
export const isErrorOfType = (error: AppError, type: ErrorType): boolean => {
  return error.type === type;
};

// Хелпер для вибрации при ошибке
export const vibrateOnError = () => {
  if (Platform.OS === 'ios') {
    const ReactNativeHapticFeedback = require('react-native-haptic-feedback').default;
    ReactNativeHapticFeedback.trigger('notificationError', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } else {
    const { Vibration } = require('react-native');
    Vibration.vibrate(400);
  }
};

export default {
  handleError,
  getErrorMessage,
  getErrorType,
  logError,
  isErrorOfType,
  vibrateOnError,
  ErrorType,
}; 