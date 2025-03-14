import { useCallback } from 'react';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Типы уведомлений
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

/**
 * Хук для работы с уведомлениями
 */
export function useNotification() {
  /**
   * Показать toast-уведомление
   * @param type Тип уведомления
   * @param title Заголовок
   * @param message Сообщение
   * @param duration Продолжительность (по умолчанию 3000мс)
   */
  const showToast = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      duration: number = 3000
    ) => {
      Toast.show({
        type,
        text1: title,
        text2: message,
        visibilityTime: duration,
        position: 'bottom',
      });
    },
    []
  );

  /**
   * Показать успешное уведомление
   * @param title Заголовок
   * @param message Сообщение
   */
  const showSuccess = useCallback(
    (title: string, message: string) => {
      showToast(NotificationType.SUCCESS, title, message);
    },
    [showToast]
  );

  /**
   * Показать уведомление об ошибке
   * @param title Заголовок
   * @param message Сообщение
   */
  const showError = useCallback(
    (title: string, message: string) => {
      showToast(NotificationType.ERROR, title, message);
    },
    [showToast]
  );

  /**
   * Показать информационное уведомление
   * @param title Заголовок
   * @param message Сообщение
   */
  const showInfo = useCallback(
    (title: string, message: string) => {
      showToast(NotificationType.INFO, title, message);
    },
    [showToast]
  );

  /**
   * Показать предупреждающее уведомление
   * @param title Заголовок
   * @param message Сообщение
   */
  const showWarning = useCallback(
    (title: string, message: string) => {
      showToast(NotificationType.WARNING, title, message);
    },
    [showToast]
  );

  /**
   * Запрос разрешения на отправку push-уведомлений
   */
  const requestNotificationPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      return token.data;
    }

    return false;
  }, []);

  /**
   * Отправить локальное push-уведомление
   * @param title Заголовок
   * @param body Текст
   * @param data Дополнительные данные
   */
  const sendLocalNotification = useCallback(
    async (title: string, body: string, data: any = {}) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null,
      });
    },
    []
  );

  /**
   * Отправить отложенное локальное push-уведомление
   * @param title Заголовок
   * @param body Текст
   * @param seconds Через сколько секунд отправить
   * @param data Дополнительные данные
   */
  const scheduleNotification = useCallback(
    async (title: string, body: string, seconds: number, data: any = {}) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: {
          seconds,
        },
      });
    },
    []
  );

  return {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    requestNotificationPermission,
    sendLocalNotification,
    scheduleNotification,
  };
}

export default useNotification; 