/**
 * Константы для маршрутов навигации в приложении
 */
export const ROUTES = {
  ROOT: {
    AUTH: 'Auth',
    CLIENT: 'Client',
    TRAINER: 'Trainer',
    USER_TYPE: 'UserType'
  },

  // Авторизация
  AUTH: {
    STACK: 'AuthStack',
    LOGIN: 'Login',
    REGISTER: 'Register',
    FORGOT_PASSWORD: 'ForgotPassword',
  },
  
  // Клиентская часть
  CLIENT: {
    // Основные экраны
    STACK: 'ClientStack',
    TABS: 'ClientTabs',
    HOME: 'ClientHome',
    WORKOUTS: 'ClientWorkouts',
    PROFILE: 'ClientProfile',
    PROGRESS: 'ClientProgress',
    
    // Детальные экраны
    WORKOUT_DETAILS: 'WorkoutDetails',
    EXERCISE_DETAILS: 'ExerciseDetails',
    EDIT_PROFILE: 'ClientEditProfile',
  },
  
  // Тренерская часть
  TRAINER: {
    // Основные экраны
    STACK: 'TrainerStack',
    TABS: 'TrainerTabs',
    HOME: 'TrainerHome',
    CLIENTS: 'TrainerClients',
    WORKOUTS: 'TrainerWorkouts',
    PROFILE: 'TrainerProfile',
    
    // Детальные экраны
    CLIENT_DETAILS: 'ClientDetails',
    WORKOUT_DETAILS: 'WorkoutDetails',
    EXERCISE_DETAILS: 'ExerciseDetails',
    CREATE_WORKOUT: 'CreateWorkout',
    EDIT_WORKOUT: 'EditWorkout',
    EDIT_PROFILE: 'TrainerEditProfile',
  },
  
  // Общие
  COMMON: {
    EXERCISES: 'Exercises',
    USER_TYPE: 'UserType',
  }
}; 