import { NavigatorScreenParams } from '@react-navigation/native';

// Типы для стека аутентификации
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  UserType: undefined;
};

// Типы для клиентских вкладок
export type ClientTabParamList = {
  ClientWorkouts: undefined;
  ClientProgress: undefined;
  Exercises: undefined;
  ClientProfile: undefined;
};

// Типы для тренерских вкладок
export type TrainerTabParamList = {
  TrainerClients: undefined;
  TrainerWorkouts: undefined;
  Exercises: undefined;
  TrainerProfile: undefined;
};

// Типы для стека клиента
export type ClientStackParamList = {
  ClientTabs: NavigatorScreenParams<ClientTabParamList>;
  WorkoutDetails: { workoutId: string };
  ExerciseDetails: { exerciseId: string };
  ClientEditProfile: undefined;
};

// Типы для стека тренера (старый вариант с вложенными табами)
export type TrainerStackParamList = {
  TrainerTabs: NavigatorScreenParams<TrainerTabParamList>;
  WorkoutDetails: { workoutId: string };
  ExerciseDetails: { exerciseId: string };
  ClientDetails: { clientId: string };
  CreateWorkout: { clientId?: string };
  EditWorkout: { workoutId: string };
};

// Новый тип для упрощенного стека тренера без вложенных табов
export type TrainerParamList = {
  // Основные экраны
  TrainerHome: undefined;
  TrainerClients: undefined;
  TrainerWorkouts: undefined;
  
  // Детальные экраны
  ClientDetails: { clientId: string };
  WorkoutDetails: { workoutId: string };
  CreateWorkout: { clientId?: string };
};

// Типы для корневого стека навигации
export type RootStackParamList = {
  // Маршруты для неаутентифицированных пользователей
  Auth: NavigatorScreenParams<AuthStackParamList>;
  
  // Маршруты для клиента
  Client: NavigatorScreenParams<ClientStackParamList>;
  
  // Маршруты для тренера
  Trainer: NavigatorScreenParams<TrainerParamList>;
  
  // Общие маршруты
  UserType: undefined;
};

// Типы для удобного доступа к экранам
export type RootScreenNames = keyof RootStackParamList;
export type AuthScreenNames = keyof AuthStackParamList;
export type ClientTabNames = keyof ClientTabParamList;
export type TrainerTabNames = keyof TrainerTabParamList;
export type ClientScreenNames = keyof ClientStackParamList;
export type TrainerScreenNames = keyof TrainerParamList; 