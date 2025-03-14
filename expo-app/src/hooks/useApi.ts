import { useState, useCallback } from 'react';

/**
 * Хук для работы с API запросами
 * Предоставляет состояние загрузки, ошибки и данные
 */
export function useApi<T, P = any>(
  apiFunction: (params: P) => Promise<{ data: T | null; error: any }>,
  initialData: T | null = null
) {
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Выполнение API запроса
   * @param params Параметры для API функции
   */
  const execute = useCallback(async (params: P) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiFunction(params);
      
      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }
      
      setData(result.data);
      return { data: result.data, error: null };
    } catch (error) {
      setError(error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [apiFunction]);

  /**
   * Очистка данных
   */
  const clearData = useCallback(() => {
    setData(initialData);
    setError(null);
  }, [initialData]);

  /**
   * Обновление данных
   * @param newData Новые данные
   */
  const updateData = useCallback((newData: T | ((prevData: T | null) => T)) => {
    if (typeof newData === 'function') {
      setData((prevData) => {
        const updateFn = newData as (prevData: T | null) => T;
        return updateFn(prevData);
      });
    } else {
      setData(newData);
    }
  }, []);

  return {
    data,
    error,
    isLoading,
    execute,
    clearData,
    updateData,
  };
}

export default useApi; 