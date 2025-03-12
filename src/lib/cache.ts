// Типы для кэша
type CacheRecord<T> = {
  data: T;
  timestamp: number;
  expiration: number; // в миллисекундах
};

// Кэш в памяти
const cache: Record<string, CacheRecord<any>> = {};

// Активные запросы для дедупликации
const pendingRequests: Record<string, Promise<any>> = {};

/**
 * API для работы с кэшем
 */
export const cacheApi = {
  /**
   * Получить данные из кэша по ключу
   */
  get: <T>(key: string): T | null => {
    const record = cache[key];
    if (!record) return null;
    
    // Проверяем истек ли срок действия кэша
    if (Date.now() - record.timestamp > record.expiration) {
      delete cache[key];
      return null;
    }
    
    return record.data as T;
  },
  
  /**
   * Сохранить данные в кэш
   * @param key - Ключ кэша
   * @param data - Данные для сохранения
   * @param expiration - Время жизни кэша в миллисекундах (по умолчанию 1 минута)
   */
  set: <T>(key: string, data: T, expiration = 60000): void => {
    cache[key] = {
      data,
      timestamp: Date.now(),
      expiration
    };
  },
  
  /**
   * Инвалидировать (удалить) данные из кэша
   * @param keyPattern - Строка или регулярное выражение для поиска ключей
   */
  invalidate: (keyPattern: string | RegExp): void => {
    if (typeof keyPattern === 'string') {
      // Удаляем конкретный ключ
      delete cache[keyPattern];
    } else {
      // Удаляем все ключи, соответствующие регулярному выражению
      Object.keys(cache).forEach(key => {
        if (keyPattern.test(key)) {
          delete cache[key];
        }
      });
    }
  },
  
  /**
   * Очистить весь кэш
   */
  clear: (): void => {
    Object.keys(cache).forEach(key => {
      delete cache[key];
    });
  }
};

/**
 * Дедупликация запросов
 * Если запрос с таким ключом уже выполняется, вернет промис существующего запроса
 * @param key - Уникальный ключ запроса
 * @param requestFn - Функция, выполняющая запрос
 * @param cacheTime - Время кэширования результата в миллисекундах (0 - не кэшировать)
 */
export const deduplicateRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>,
  cacheTime = 60000
): Promise<T> => {
  // Сначала проверяем кэш
  if (cacheTime > 0) {
    const cachedData = cacheApi.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }
  }
  
  // Проверяем, есть ли уже активный запрос с таким ключом
  if (key in pendingRequests) {
    return pendingRequests[key];
  }
  
  // Создаем новый запрос и сохраняем его
  try {
    pendingRequests[key] = requestFn();
    const result = await pendingRequests[key];
    
    // Сохраняем результат в кэш, если нужно
    if (cacheTime > 0) {
      cacheApi.set(key, result, cacheTime);
    }
    
    return result;
  } finally {
    // Удаляем запрос из списка активных после выполнения
    delete pendingRequests[key];
  }
};

/**
 * Обертка для API-методов с поддержкой кэширования и дедупликации
 * @param key - Уникальный ключ для запроса
 * @param apiFn - Функция API, возвращающая Promise
 * @param cacheTime - Время кэширования в миллисекундах (0 - не кэшировать)
 */
export const withCache = <T extends (...args: any[]) => Promise<any>>(
  key: string,
  apiFn: T,
  cacheTime = 60000
): T => {
  return ((...args: any[]) => {
    const cacheKey = `${key}:${JSON.stringify(args)}`;
    return deduplicateRequest(
      cacheKey,
      () => apiFn(...args),
      cacheTime
    );
  }) as T;
}; 