import { createRef } from 'react';
import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import { ROUTES } from '../constants/routes';

// Создаем ref для получения доступа к навигации из любого места в приложении
export const navigationRef = createRef<NavigationContainerRef<any>>();

// Функция для навигации на указанный экран
export function navigate(name: string, params?: any) {
  if (navigationRef.current) {
    navigationRef.current.navigate(name, params);
  } else {
    // Сохраняем информацию о навигации, чтобы выполнить ее позже
    // когда navigationRef будет доступен
    console.warn(`Navigation to ${name} failed. Navigation wasn't mounted.`);
  }
}

// Функция для замены текущего экрана
export function replace(name: string, params?: any) {
  if (navigationRef.current) {
    navigationRef.current.dispatch(StackActions.replace(name, params));
  }
}

// Функция для возврата назад
export function goBack() {
  if (navigationRef.current) {
    navigationRef.current.goBack();
  }
}

// Функция для перехода к определенному экрану в стеке
export function reset(routes: { name: string; params?: any }[], index: number = 0) {
  if (navigationRef.current) {
    navigationRef.current.reset({
      index,
      routes,
    });
  }
}

// Функция для очистки стека и перехода к экрану
export function navigateAndReset(routeName: string, params?: any) {
  if (navigationRef.current) {
    navigationRef.current.reset({
      index: 0,
      routes: [{ name: routeName, params }],
    });
  }
}

// Вспомогательные функции для частых навигационных сценариев

// Перейти к клиентскому стеку
export function navigateToClientStack() {
  navigateAndReset(ROUTES.ROOT.CLIENT);
}

// Перейти к стеку тренера
export function navigateToTrainerStack() {
  navigateAndReset(ROUTES.ROOT.TRAINER);
}

// Перейти к аутентификации
export function navigateToAuth() {
  navigateAndReset(ROUTES.ROOT.AUTH);
}

// Перейти к стеку упражнений
export function navigateToExercises() {
  navigate(ROUTES.COMMON.EXERCISES);
}

// Получить текущий маршрут
export function getCurrentRoute() {
  return navigationRef.current ? navigationRef.current.getCurrentRoute() : null;
}

// Получить состояние навигации
export function getRootState() {
  return navigationRef.current ? navigationRef.current.getRootState() : null;
}

export default {
  navigate,
  replace,
  goBack,
  reset,
  navigateAndReset,
  navigateToClientStack,
  navigateToTrainerStack,
  navigateToAuth,
  navigateToExercises,
  getCurrentRoute,
  getRootState,
}; 