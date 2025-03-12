import { supabase } from './supabase';
import { UserFormData, UserRole } from '../types/user';
import { Workout, Program } from '../types/workout';
import { withCache } from './cache';

// Интерфейс для следующей тренировки
interface NextWorkout {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  details: string;
  training_program_id: string;
  program_title: string;
  client_id: string;
  completed: boolean;
  trainingDescription: string;
  duration: number;
  thumbnail: string | null;
}

// Аутентификация
export const authApi = {
  // Вход пользователя
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },

  // Регистрация пользователя
  signUp: async (userData: UserFormData, role: UserRole) => {
    return await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: role,
          secretPhrase: userData.secretPhrase
        },
      },
    });
  },

  // Выход пользователя
  signOut: async () => {
    return await supabase.auth.signOut();
  },

  // Получение текущего пользователя
  getCurrentUser: async () => {
    return await supabase.auth.getUser();
  },

  // Установка сессии
  setSession: async (accessToken: string, refreshToken: string) => {
    return await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }
};

// Работа с клиентами
export const clientsApi = {
  // Создание записи клиента
  createClient: async (userId: string, firstName: string, lastName: string) => {
    return await supabase
      .from('clients')
      .insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        subscription_status: 'active'
      });
  },

  // Получение всех клиентов
  getAllClients: async () => {
    return await supabase
      .from('clients')
      .select('*');
  },

  // Получение клиента по ID пользователя
  getClientByUserId: async (userId: string) => {
    return await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .single();
  }
};

// Работа с тренировками
export const workoutsApi = {
  // Получение тренировки по ID
  getWorkoutById: async (workoutId: string) => {
    // Получаем базовую информацию о тренировке
    const { data: workout, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .single();
      
    if (error) {
      return { data: null, error };
    }
    
    // Если у тренировки есть training_program_id, получаем связанную программу
    if (workout && workout.training_program_id) {
      const { data: program, error: programError } = await supabase
        .from('training_programs')
        .select('*')
        .eq('id', workout.training_program_id)
        .single();
        
      if (!programError && program) {
        return { 
          data: { ...workout, program }, 
          error: null 
        };
      }
    }
    
    return { data: workout, error: null };
  },

  // Получение всех тренировок пользователя
  getUserWorkouts: async (userId: string) => {
    // Получаем все тренировки пользователя
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
      
    if (error) {
      return { data: null, error };
    }
    
    // Если есть тренировки с training_program_id, получаем их программы
    if (workouts && workouts.length > 0) {
      const programIds = workouts
        .map(w => w.training_program_id)
        .filter(Boolean);
        
      if (programIds.length > 0) {
        const { data: programs, error: programsError } = await supabase
          .from('training_programs')
          .select('*')
          .in('id', programIds);
          
        if (!programsError && programs) {
          // Связываем тренировки с программами
          const workoutsWithPrograms = workouts.map(workout => {
            const program = programs.find(p => p.id === workout.training_program_id);
            return { ...workout, program: program || null };
          });
          
          return { data: workoutsWithPrograms, error: null };
        }
      }
    }
    
    return { data: workouts, error: null };
  },

  // Получение следующей тренировки пользователя
  getNextWorkout: async (userId: string) => {
    const now = new Date().toISOString();
    
    // Получаем следующую тренировку
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(1);
      
    if (error) {
      return { data: null, error };
    }
    
    if (workouts && workouts.length > 0) {
      const workout = workouts[0];
      
      // Если у тренировки есть training_program_id, получаем связанную программу
      if (workout.training_program_id) {
        const { data: program, error: programError } = await supabase
          .from('training_programs')
          .select('*')
          .eq('id', workout.training_program_id)
          .single();
          
        if (!programError && program) {
          return { 
            data: { ...workout, program }, 
            error: null 
          };
        }
      }
      
      return { data: workout, error: null };
    }
    
    return { data: null, error: null };
  },

  // Создание новой тренировки
  createWorkout: async (workout: Partial<Workout>) => {
    return await supabase
      .from('workouts')
      .insert(workout);
  },

  // Обновление тренировки
  updateWorkout: async (workoutId: string, workout: Partial<Workout>) => {
    return await supabase
      .from('workouts')
      .update(workout)
      .eq('id', workoutId);
  },

  // Удаление тренировки
  deleteWorkout: async (workoutId: string) => {
    return await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId);
  }
};

// Работа с программами тренировок
export const programsApi = {
  // Получение программы по ID
  getProgramById: async (programId: string) => {
    return await supabase
      .from('training_programs')
      .select('*')
      .eq('id', programId)
      .single();
  },

  // Получение всех программ
  getAllPrograms: async () => {
    return await supabase
      .from('training_programs')
      .select('*');
  },

  // Создание новой программы
  createProgram: async (program: Partial<Program>) => {
    return await supabase
      .from('training_programs')
      .insert(program);
  },

  // Обновление программы
  updateProgram: async (programId: string, program: Partial<Program>) => {
    return await supabase
      .from('training_programs')
      .update(program)
      .eq('id', programId);
  },

  // Удаление программы
  deleteProgram: async (programId: string) => {
    return await supabase
      .from('training_programs')
      .delete()
      .eq('id', programId);
  }
};

// Работа с измерениями
export const measurementsApi = {
  // Получение всех измерений клиента
  getAllMeasurements: async (clientId: string) => {
    return await supabase
      .from('client_measurements')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });
  },
  
  // Добавление нового измерения
  addMeasurement: async (measurement: any) => {
    return await supabase
      .from('client_measurements')
      .insert(measurement);
  },
  
  // Обновление измерения
  updateMeasurement: async (measurementId: string, data: any) => {
    return await supabase
      .from('client_measurements')
      .update(data)
      .eq('id', measurementId);
  },
  
  // Удаление измерения
  deleteMeasurement: async (measurementId: string) => {
    return await supabase
      .from('client_measurements')
      .delete()
      .eq('id', measurementId);
  }
};

// Работа с активностями
export const activitiesApi = {
  // Получение всех активностей клиента
  getAllActivities: async (clientId: string) => {
    return await supabase
      .from('client_activities')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });
  },
  
  // Добавление новой активности
  addActivity: async (activity: any) => {
    return await supabase
      .from('client_activities')
      .insert(activity);
  },
  
  // Обновление активности
  updateActivity: async (activityId: string, data: any) => {
    return await supabase
      .from('client_activities')
      .update(data)
      .eq('id', activityId);
  },
  
  // Удаление активности
  deleteActivity: async (activityId: string) => {
    return await supabase
      .from('client_activities')
      .delete()
      .eq('id', activityId);
  }
};

// Работа с достижениями
export const achievementsApi = {
  // В данный момент достижения генерируются на клиенте,
  // но здесь можно добавить методы для работы с ними, если появится серверная логика
};

// Работа со статистикой
export const statsApi = {
  // Получение статистики тренировок
  getWorkoutStats: async (clientId: string) => {
    // Получаем все тренировки клиента
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('client_id', clientId);
      
    if (error) throw error;
    
    // Получаем завершенные тренировки из workout_completions
    const { data: completions, error: completionsError } = await supabase
      .from('workout_completions')
      .select('*')
      .eq('client_id', clientId);
      
    if (completionsError) throw completionsError;
    
    // Получаем завершенные тренировки по полю completed
    const { data: completedWorkouts, error: completedWorkoutsError } = await supabase
      .from('workouts')
      .select('*')
      .eq('client_id', clientId)
      .eq('completed', true);
      
    let completedCount = 0;
    
    // Определяем количество завершенных тренировок
    if (completions && completions.length > 0) {
      completedCount = completions.length;
    } else if (completedWorkouts && completedWorkouts.length > 0) {
      completedCount = completedWorkouts.length;
    }
    
    // Возвращаем статистику тренировок
    return {
      totalCount: workouts?.length || 0,
      completedCount,
      // Для расчета totalVolume потребуется больше запросов и логики,
      // это будет реализовано в полном рефакторинге
      totalVolume: 2500
    };
  },
  
  // Получение статистики активностей
  getActivityStats: async (clientId: string) => {
    const { data: activities, error } = await supabase
      .from('client_activities')
      .select('*')
      .eq('client_id', clientId);
      
    if (error) throw error;
    
    // Группируем активности по типу
    const types: {[key: string]: number} = {};
    let totalMinutes = 0;
    
    activities?.forEach(activity => {
      const duration = activity.duration || 0;
      totalMinutes += duration;
      
      if (activity.type) {
        types[activity.type] = (types[activity.type] || 0) + duration;
      }
    });
    
    return {
      totalMinutes,
      types
    };
  },
  
  // Получение статистики измерений
  getMeasurementStats: async (clientId: string) => {
    // Получаем все измерения, отсортированные по дате
    const { data: measurements, error } = await supabase
      .from('client_measurements')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });
      
    if (error) throw error;
    
    // Определяем текущий и начальный вес
    const currentWeight = measurements && measurements.length > 0 ? measurements[0].weight : null;
    const initialWeight = measurements && measurements.length > 0 ? measurements[measurements.length - 1].weight : null;
    const weightChange = currentWeight && initialWeight ? currentWeight - initialWeight : null;
    
    return {
      currentWeight,
      initialWeight,
      weightChange
    };
  },
  
  // Получение следующей тренировки
  getNextWorkout: async (clientId: string): Promise<NextWorkout | null> => {
    try {
      // Получаем все тренировки клиента
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId)
        .order('start_time', { ascending: true })
        .limit(10);
        
      if (error) throw error;
      
      // Находим ближайшую тренировку, которая еще не началась
      const now = new Date();
      const nextWorkout = workouts?.find(workout => 
        new Date(workout.start_time) > now
      );
      
      if (nextWorkout) {
        // Получаем программу тренировки
        const { data: program, error: programError } = await supabase
          .from('training_programs')
          .select('*')
          .eq('id', nextWorkout.training_program_id)
          .single();
          
        if (programError) throw programError;
        
        // Проверяем есть ли у нас необходимые данные, иначе вернем null
        if (!nextWorkout.id || !program?.id) {
          console.warn('Missing required data in nextWorkout or program');
          return null;
        }
        
        // Формируем ответ с объединенными данными
        return {
          id: nextWorkout.id,
          title: nextWorkout.title || program?.title || 'Тренировка',
          start_time: nextWorkout.start_time,
          end_time: nextWorkout.end_time,
          location: nextWorkout.location || 'Не указано',
          details: nextWorkout.details || '',
          training_program_id: program.id,
          program_title: program.title,
          client_id: nextWorkout.client_id,
          completed: nextWorkout.completed || false,
          trainingDescription: program.description || '',
          duration: program.duration || 60,
          thumbnail: program.thumbnail || null
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching next workout:', error);
      return null;
    }
  }
}; 