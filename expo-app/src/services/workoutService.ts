import { supabase } from '../api/supabase';
import errorHandler from '../utils/errorHandler';
import { Client } from './clientService';

// Интерфейс для тренировки
export interface Workout {
  id: string;
  trainer_id: string;
  client_id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  client?: Client;
  exercises: Exercise[];
}

// Интерфейс для упражнения
export interface Exercise {
  id: string;
  workout_id: string;
  name: string;
  description?: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  rest_time?: number;
  order: number;
  created_at: string;
}

/**
 * Получение списка тренировок клиента
 * @param clientId ID клиента
 */
export const getClientWorkouts = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка получения тренировок',
    });
    return { data: null, error: appError };
  }
};

/**
 * Получение списка тренировок тренера
 * @param trainerId ID тренера
 */
export const getTrainerWorkouts = async (trainerId: string) => {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*, clients(*)')
      .eq('trainer_id', trainerId)
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка получения тренировок',
    });
    return { data: null, error: appError };
  }
};

/**
 * Получение деталей тренировки
 * @param workoutId ID тренировки
 */
export const getWorkoutDetails = async (workoutId: string) => {
  try {
    // Получаем информацию о тренировке
    const { data, error } = await supabase
      .from('workouts')
      .select('*, clients(*)')
      .eq('id', workoutId)
      .single();

    if (error) {
      throw error;
    }

    // Получаем упражнения для этой тренировки
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order', { ascending: true });

    if (exercisesError) {
      throw exercisesError;
    }

    return {
      data: {
        ...data,
        exercises: exercises || [],
      },
      error: null,
    };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка получения деталей тренировки',
    });
    return { data: null, error: appError };
  }
};

/**
 * Создание новой тренировки
 * @param workoutData Данные для создания тренировки
 */
export const createWorkout = async (workoutData: {
  trainer_id: string;
  client_id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  exercises: Omit<Exercise, 'id' | 'workout_id' | 'created_at'>[];
}) => {
  try {
    // Начинаем транзакцию
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert([
        {
          trainer_id: workoutData.trainer_id,
          client_id: workoutData.client_id,
          title: workoutData.title,
          description: workoutData.description || '',
          date: workoutData.date,
          time: workoutData.time || '',
          status: 'scheduled',
        },
      ])
      .select()
      .single();

    if (workoutError) {
      throw workoutError;
    }

    // Если есть упражнения, добавляем их
    if (workoutData.exercises && workoutData.exercises.length > 0) {
      const exercisesToInsert = workoutData.exercises.map((exercise, index) => ({
        workout_id: workout.id,
        name: exercise.name,
        description: exercise.description || '',
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight || 0,
        duration: exercise.duration || 0,
        rest_time: exercise.rest_time || 0,
        order: exercise.order || index,
      }));

      const { error: exercisesError } = await supabase
        .from('exercises')
        .insert(exercisesToInsert);

      if (exercisesError) {
        throw exercisesError;
      }
    }

    return { data: workout, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка создания тренировки',
      showToast: true,
    });
    return { data: null, error: appError };
  }
};

/**
 * Обновление тренировки
 * @param workoutId ID тренировки
 * @param workoutData Данные для обновления
 */
export const updateWorkout = async (
  workoutId: string,
  workoutData: Partial<Omit<Workout, 'id' | 'created_at' | 'client' | 'exercises'>>
) => {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .update(workoutData)
      .eq('id', workoutId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка обновления тренировки',
      showToast: true,
    });
    return { data: null, error: appError };
  }
};

/**
 * Добавление упражнения к тренировке
 * @param workoutId ID тренировки
 * @param exerciseData Данные упражнения
 */
export const addExerciseToWorkout = async (
  workoutId: string,
  exerciseData: Omit<Exercise, 'id' | 'workout_id' | 'created_at'>
) => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .insert([
        {
          workout_id: workoutId,
          name: exerciseData.name,
          description: exerciseData.description || '',
          sets: exerciseData.sets,
          reps: exerciseData.reps,
          weight: exerciseData.weight || 0,
          duration: exerciseData.duration || 0,
          rest_time: exerciseData.rest_time || 0,
          order: exerciseData.order,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка добавления упражнения',
      showToast: true,
    });
    return { data: null, error: appError };
  }
};

/**
 * Удаление упражнения из тренировки
 * @param exerciseId ID упражнения
 */
export const removeExerciseFromWorkout = async (exerciseId: string) => {
  try {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', exerciseId);

    if (error) {
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка удаления упражнения',
      showToast: true,
    });
    return { success: false, error: appError };
  }
};

/**
 * Изменение статуса тренировки
 * @param workoutId ID тренировки
 * @param status Новый статус
 */
export const updateWorkoutStatus = async (
  workoutId: string,
  status: 'scheduled' | 'completed' | 'cancelled'
) => {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .update({ status })
      .eq('id', workoutId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    const appError = await errorHandler.handleError(error, {
      toastTitle: 'Ошибка обновления статуса',
      showToast: true,
    });
    return { data: null, error: appError };
  }
};

export default {
  getClientWorkouts,
  getTrainerWorkouts,
  getWorkoutDetails,
  createWorkout,
  updateWorkout,
  addExerciseToWorkout,
  removeExerciseFromWorkout,
  updateWorkoutStatus,
}; 