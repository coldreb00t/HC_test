import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { UserRole } from '../types/user';
import { Workout } from '../types/workout';
import { authApi, workoutsApi } from './api';

// Хук для работы с аутентификацией
export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Получение текущего пользователя при загрузке
    const getCurrentUser = async () => {
      try {
        const { data, error } = await authApi.getCurrentUser();
        if (error) throw error;
        
        if (data?.user) {
          setUser(data.user);
          setUserRole(data.user.user_metadata?.role || null);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();

    // Подписка на изменения аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setUserRole(session.user.user_metadata?.role || null);
        } else {
          setUser(null);
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Функция выхода
  const signOut = async () => {
    try {
      await authApi.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return { user, loading, userRole, signOut };
};

// Хук для работы с тренировками
export const useWorkouts = (userId: string | undefined) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkouts = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await workoutsApi.getUserWorkouts(userId);
      if (error) throw error;
      
      setWorkouts(data || []);
    } catch (err: any) {
      console.error('Error fetching workouts:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  return { workouts, loading, error, refetch: fetchWorkouts };
};

// Хук для работы с одной тренировкой
export const useWorkout = (workoutId: string | undefined) => {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkout = useCallback(async () => {
    if (!workoutId) return;
    
    setLoading(true);
    try {
      const { data, error } = await workoutsApi.getWorkoutById(workoutId);
      if (error) throw error;
      
      setWorkout(data || null);
    } catch (err: any) {
      console.error('Error fetching workout:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  return { workout, loading, error, refetch: fetchWorkout };
};

// Хук для работы с размерами окна
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// Хук для работы с локальным хранилищем
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
};

// Хук для работы с медиа-запросами
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}; 