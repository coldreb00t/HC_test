// Типы активностей
export const ACTIVITY_TYPES = [
  { id: 'running', name: 'Бег', icon: 'running' },
  { id: 'cycling', name: 'Велосипед', icon: 'cycling' },
  { id: 'swimming', name: 'Плавание', icon: 'swimming' },
  { id: 'walking', name: 'Ходьба', icon: 'walking' },
  { id: 'hiking', name: 'Поход', icon: 'hiking' },
  { id: 'yoga', name: 'Йога', icon: 'yoga' },
  { id: 'strength', name: 'Силовая тренировка', icon: 'strength' },
  { id: 'other', name: 'Другое', icon: 'other' }
];

// Статусы подписки
export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  EXPIRED: 'expired'
};

// Типы измерений
export const MEASUREMENT_TYPES = {
  WEIGHT: 'weight',
  BODY_FAT: 'body_fat',
  MUSCLE_MASS: 'muscle_mass',
  CHEST: 'chest',
  WAIST: 'waist',
  HIPS: 'hips',
  BICEPS: 'biceps',
  THIGHS: 'thighs'
};

// Названия измерений
export const MEASUREMENT_NAMES = {
  [MEASUREMENT_TYPES.WEIGHT]: 'Вес',
  [MEASUREMENT_TYPES.BODY_FAT]: 'Процент жира',
  [MEASUREMENT_TYPES.MUSCLE_MASS]: 'Мышечная масса',
  [MEASUREMENT_TYPES.CHEST]: 'Грудь',
  [MEASUREMENT_TYPES.WAIST]: 'Талия',
  [MEASUREMENT_TYPES.HIPS]: 'Бедра',
  [MEASUREMENT_TYPES.BICEPS]: 'Бицепс',
  [MEASUREMENT_TYPES.THIGHS]: 'Бедро'
};

// Единицы измерения
export const MEASUREMENT_UNITS = {
  [MEASUREMENT_TYPES.WEIGHT]: 'кг',
  [MEASUREMENT_TYPES.BODY_FAT]: '%',
  [MEASUREMENT_TYPES.MUSCLE_MASS]: 'кг',
  [MEASUREMENT_TYPES.CHEST]: 'см',
  [MEASUREMENT_TYPES.WAIST]: 'см',
  [MEASUREMENT_TYPES.HIPS]: 'см',
  [MEASUREMENT_TYPES.BICEPS]: 'см',
  [MEASUREMENT_TYPES.THIGHS]: 'см'
};

// Цвета для графиков
export const CHART_COLORS = {
  PRIMARY: '#f97316', // orange-500
  SECONDARY: '#3b82f6', // blue-500
  SUCCESS: '#22c55e', // green-500
  DANGER: '#ef4444', // red-500
  WARNING: '#f59e0b', // amber-500
  INFO: '#06b6d4', // cyan-500
  LIGHT: '#f3f4f6', // gray-100
  DARK: '#1f2937' // gray-800
};

// Мотивационные фразы
export const MOTIVATIONAL_PHRASES = [
  'Каждая тренировка приближает тебя к цели!',
  'Сила не приходит из того, что ты можешь делать. Она приходит из преодоления того, что ты не можешь.',
  'Твое тело может все. Это твой разум нужно убедить.',
  'Не останавливайся, когда устал. Остановись, когда закончил.',
  'Успех — это сумма небольших усилий, повторяющихся изо дня в день.',
  'Боль временна. Гордость вечна.',
  'Сделай сегодня то, что другие не хотят, завтра будешь жить так, как другие не могут.',
  'Тяжело в тренировке — легко в бою.',
  'Лучшая версия тебя ждет на другой стороне боли.',
  'Ты сильнее, чем ты думаешь.'
];

// Пути навигации
export const ROUTES = {
  LOGIN: '/login',
  CLIENT: {
    DASHBOARD: '/client',
    WORKOUTS: '/client/workouts',
    WORKOUT_DETAILS: (id: string) => `/client/workouts/${id}`,
    PROGRESS_PHOTO_NEW: '/client/progress-photo/new',
    PROGRESS: '/client/progress',
    MEASUREMENTS_NEW: '/client/measurements/new',
    MEASUREMENTS: '/client/measurements',
    NUTRITION: '/client/nutrition',
    ACTIVITY: '/client/activity',
    ACTIVITY_NEW: '/client/activity/new',
    ACHIEVEMENTS: '/client/achievements'
  },
  TRAINER: {
    DASHBOARD: '/trainer',
    CLIENTS: '/trainer/clients',
    CLIENT_PROFILE: (id: string) => `/trainer/clients/${id}`,
    CALENDAR: '/trainer/calendar',
    EXERCISES: '/trainer/exercises'
  }
}; 