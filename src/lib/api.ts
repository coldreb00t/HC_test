import { supabase } from './supabase';
import { UserFormData, UserRole } from '../types/user';
import { Workout, Program } from '../types/workout';

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