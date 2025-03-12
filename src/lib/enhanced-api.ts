import { 
  statsApi, 
  workoutsApi, 
  measurementsApi, 
  activitiesApi 
} from './api';
import { withCache } from './cache';

/**
 * Расширенные API-методы с кэшированием и дедупликацией
 */

// Статистика с кэшированием
export const statsApiWithCache = {
  // Кэшируем статистику тренировок на 5 минут
  getWorkoutStats: withCache('workout-stats', statsApi.getWorkoutStats, 5 * 60 * 1000),
  
  // Кэшируем статистику активностей на 5 минут
  getActivityStats: withCache('activity-stats', statsApi.getActivityStats, 5 * 60 * 1000),
  
  // Кэшируем статистику измерений на 5 минут
  getMeasurementStats: withCache('measurement-stats', statsApi.getMeasurementStats, 5 * 60 * 1000),
  
  // Кэшируем следующую тренировку на 1 минуту (короткий период, так как данные могут измениться)
  getNextWorkout: withCache('next-workout', statsApi.getNextWorkout, 60 * 1000)
};

// Тренировки с кэшированием
export const workoutsApiWithCache = {
  // Кэшируем детали тренировки на 5 минут
  getWorkoutById: withCache('workout-details', workoutsApi.getWorkoutById, 5 * 60 * 1000),
  
  // Получение всех тренировок пользователя с кэшем на 2 минуты
  getUserWorkouts: withCache('user-workouts', 
    async (userId: string) => {
      return await workoutsApi.getUserWorkouts(userId);
    }, 
    2 * 60 * 1000
  )
};

// Измерения с кэшированием
export const measurementsApiWithCache = {
  // Кэшируем получение всех измерений на 5 минут
  getAllMeasurements: withCache('all-measurements', measurementsApi.getAllMeasurements, 5 * 60 * 1000)
};

// Активности с кэшированием
export const activitiesApiWithCache = {
  // Кэшируем получение всех активностей на 5 минут
  getAllActivities: withCache('all-activities', activitiesApi.getAllActivities, 5 * 60 * 1000)
};

/**
 * Комплексные запросы данных
 */

/**
 * Загрузка всех данных для дашборда одним методом
 * @param clientId - ID клиента
 */
export const loadDashboardData = async (clientId: string) => {
  try {
    // Загружаем все данные параллельно с использованием кэширующих методов
    const [
      nextWorkout,
      workoutStats,
      activityStats,
      measurementStats
    ] = await Promise.all([
      statsApiWithCache.getNextWorkout(clientId),
      statsApiWithCache.getWorkoutStats(clientId),
      statsApiWithCache.getActivityStats(clientId),
      statsApiWithCache.getMeasurementStats(clientId)
    ]);
    
    return {
      nextWorkout,
      workoutStats,
      activityStats,
      measurementStats
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    throw error;
  }
}; 