/**
 * Константы для маршрутов навигации в приложении
 */
export const ROUTES = {
  // Авторизация
  AUTH: {
    LOGIN: 'Login',
    REGISTER: 'Register',
    FORGOT_PASSWORD: 'ForgotPassword',
    RESET_PASSWORD: 'ResetPassword',
  },
  
  // Клиентская часть
  CLIENT: {
    // Основные экраны
    MAIN_TAB: 'ClientMainTab',
    HOME: 'ClientHome',
    WORKOUTS: 'ClientWorkouts',
    PROFILE: 'ClientProfile',
    
    // Детальные экраны
    WORKOUT_DETAILS: 'WorkoutDetails',
    EXERCISE_DETAILS: 'ExerciseDetails',
    EDIT_PROFILE: 'ClientEditProfile',
    DASHBOARD: 'ClientDashboard',
    PROGRESS_PHOTOS: 'ProgressPhotos',
    PHOTO_UPLOAD: 'PhotoUpload',
    MEASUREMENTS: 'Measurements',
    MEASUREMENTS_UPLOAD: 'MeasurementsUpload',
    NUTRITION: 'Nutrition',
    ACTIVITY: 'ActivityForm',
    ACHIEVEMENTS: 'Achievements'
  },
  
  // Тренерская часть
  TRAINER: {
    // Основные экраны
    MAIN_TAB: 'TrainerMainTab',
    HOME: 'TrainerHome',
    CLIENTS: 'TrainerClients',
    WORKOUTS: 'TrainerWorkouts',
    PROFILE: 'TrainerProfile',
    
    // Детальные экраны
    CLIENT_DETAILS: 'ClientDetails',
    ADD_CLIENT: 'AddClient',
    WORKOUT_DETAILS: 'TrainerWorkoutDetails',
    CREATE_WORKOUT: 'CreateWorkout',
    EDIT_WORKOUT: 'EditWorkout',
    EDIT_PROFILE: 'TrainerEditProfile',
    DASHBOARD: 'TrainerDashboard',
    EXERCISES: 'Exercises'
  },
  
  // Общие
  COMMON: {
    ONBOARDING: 'Onboarding',
    USER_TYPE: 'UserType',
  }
}; 