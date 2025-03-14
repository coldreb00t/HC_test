import { useState, useCallback } from 'react';

/**
 * Хук для управления состоянием формы
 */
export function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  /**
   * Изменение значения поля формы
   * @param field Имя поля
   * @param value Новое значение
   */
  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Очищаем ошибку при изменении поля
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  }, []);

  /**
   * Пометка поля как посещенного (для валидации при blur)
   * @param field Имя поля
   */
  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  }, []);

  /**
   * Установка ошибки для конкретного поля
   * @param field Имя поля
   * @param message Сообщение об ошибке
   */
  const setFieldError = useCallback((field: keyof T, message: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  /**
   * Сброс формы к исходным значениям
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Валидация формы с использованием предоставленной функции
   * @param validateFn Функция валидации, возвращающая объект с ошибками
   */
  const validateForm = useCallback(
    (validateFn: (values: T) => Partial<Record<keyof T, string>>) => {
      const formErrors = validateFn(values);
      setErrors(formErrors);
      
      // Помечаем все поля как посещенные
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({
          ...acc,
          [key]: true,
        }),
        {}
      );
      setTouched(allTouched as Partial<Record<keyof T, boolean>>);
      
      return Object.keys(formErrors).length === 0;
    },
    [values]
  );

  /**
   * Установка нескольких значений одновременно
   * @param newValues Объект с новыми значениями
   */
  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldError,
    resetForm,
    validateForm,
    setValues: setMultipleValues,
  };
}

export default useForm; 