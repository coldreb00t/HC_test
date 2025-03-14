/**
 * Главный входной файл приложения, экспортирующий все основные компоненты
 * Это помогает сделать более чистые импорты в других файлах
 */

// Контексты
export { AuthProvider, useAuth } from './context/AuthContext';
export { ThemeProvider, useTheme } from './context/ThemeContext';

// Навигация
export { default as AppNavigation } from './navigation/AppNavigation';
export { default as AuthStack } from './navigation/AuthStack';
export { default as ClientStack } from './navigation/ClientStack';
export { default as TrainerStack } from './navigation/TrainerStack';
export * from './navigation/rootNavigation';

// Сервисы
export * from './services/authService';
export * from './services/clientService';
export * from './services/trainerService';
export * from './services/workoutService';

// Константы
export * from './constants/routes';

// Утилиты
export * from './utils/errorHandler';
export * from './utils/appSetup';

// Хуки
export * from './hooks/useApi';
export * from './hooks/useForm';
export * from './hooks/useNotification';

// API
export { supabase, setClientSupabase } from './api/supabase';

// Типы
export * from './types/models';
export * from './types/navigation.types';

// Стили
export * from './styles/theme'; 