import React, { useState, useEffect, TouchEvent, ReactNode } from 'react';
import { 
  User, 
  Calendar, 
  BarChart2, 
  Activity, 
  Dumbbell, 
  Award, 
  ChevronRight, 
  LogOut, 
  ArrowLeft, 
  ArrowRight, 
  Menu, 
  Scale, 
  Camera, 
  Utensils, 
  XCircle,
  ArrowUp,
  ChevronDown,
  Share2,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';
import { useClientNavigation } from '../lib/navigation';
import { MeasurementsInputModal } from './MeasurementsInputModal';
import { Workout } from '../types/workout';
import { RaiseTheBeastMotivation } from './RaiseTheBeastMotivation';
import { ShareAchievementModal } from './ShareAchievementModal';
import { loadDashboardData, statsApiWithCache } from '../lib/enhanced-api';

// Переименовываем интерфейс, чтобы избежать конфликта с импортированным типом
interface NextWorkout extends Workout {}

// Расширенный интерфейс достижения с мотивационной фразой
interface Achievement {
  title: string;
  description: string;
  icon: ReactNode;
  value: string;
  color: string;
  bgImage?: string; // Для зверей
  achievementImage?: string; // Для обычных достижений
  motivationalPhrase: string; // Добавлено поле для мотивационной фразы
  beastComponent?: boolean; // Флаг, указывающий на специальный компонент RaiseTheBeastMotivation
}

// Расширенный интерфейс для хранения статистики пользователя
interface UserStats {
  workouts: {
    totalCount: number;
    completedCount: number;
    totalVolume: number; // в кг
  };
  activities: {
    totalMinutes: number;
    types: {[key: string]: number};
  };
  measurements: {
    currentWeight: number | null;
    initialWeight: number | null;
    weightChange: number | null;
  };
  achievements: {
    total: number;
    completed: number;
  };
}

interface SidebarLayoutProps {
  children: ReactNode;
  menuItems: Array<{
    icon: ReactNode;
    label: string;
    onClick: () => void;
  }>;
  variant: "bottom";
  customHeader?: ReactNode;
}

export function ClientDashboard() {
  const navigate = useNavigate();
  const [nextWorkout, setNextWorkout] = useState<NextWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [clientData, setClientData] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    user_id: string;
  } | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    workouts: {
      totalCount: 0,
      completedCount: 0,
      totalVolume: 0
    },
    activities: {
      totalMinutes: 0,
      types: {}
    },
    measurements: {
      currentWeight: null,
      initialWeight: null,
      weightChange: null
    },
    achievements: {
      total: 0,
      completed: 0
    }
  });
  
  // Для слайдера достижений
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  
  // Массив достижений
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  
  const [shareModalData, setShareModalData] = useState<{
    isOpen: boolean;
    userName: string;
    beastName: string;
    weightPhrase: string;
    totalVolume: number;
    nextBeastThreshold: number;
    currentBeastThreshold: number;
    beastImage: string;
    achievementImage: string;
    isBeast: boolean;
    displayValue: string;
    unit: string;
    motivationalPhrase: string;
  } | null>(null);
  
  useEffect(() => {
    // При первой загрузке установим демонстрационные достижения,
    // чтобы слайдер не был пустым
    const demoAchievements = [
      {
        title: 'Завершенные тренировки',
        description: 'Регулярность - ключ к результатам',
        value: '0',
        icon: <Calendar className="w-16 h-16 text-white" />,
        color: 'bg-orange-500',
        bgImage: '/images/achievements/workouts.jpg',
        motivationalPhrase: 'Регулярные тренировки сделают невозможное возможным!'
      },
      {
        title: 'Объем нагрузки',
        description: 'Общий вес, который ты поднял',
        value: '0',
        icon: <Dumbbell className="w-16 h-16 text-white" />,
        color: 'bg-blue-500',
        bgImage: '/images/achievements/volume.jpg',
        motivationalPhrase: 'Каждый поднятый килограмм приближает тебя к цели!'
      },
      {
        title: 'Любимая активность',
        description: 'Физические упражнения',
        value: 'Добавь активность',
        icon: <Activity className="w-16 h-16 text-white" />,
        color: 'bg-green-500',
        bgImage: '/images/achievements/activity.jpg',
        motivationalPhrase: 'Найди то, что приносит радость, и это уже не будет казаться тренировкой!'
      },
      {
        title: 'Изменение тела',
        description: 'Отслеживание прогресса',
        value: 'Добавь замеры',
        icon: <Scale className="w-16 h-16 text-white" />,
        color: 'bg-purple-500',
        bgImage: '/images/achievements/progress.jpg',
        motivationalPhrase: 'Не сравнивай себя с другими, сравнивай с собой вчерашним!'
      },
      {
        title: 'Общая активность',
        description: 'Суммарное время движения',
        value: 'Добавь активность',
        icon: <Award className="w-16 h-16 text-white" />,
        color: 'bg-yellow-500',
        bgImage: '/images/achievements/trophies.jpg',
        motivationalPhrase: 'Движение - это жизнь. Будь активен каждый день!'
      }
    ];
    
    setAchievements(demoAchievements);
    
    const fetchData = async () => {
      try {
        console.log('Начинаем загрузку данных');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('Пользователь авторизован:', user.id);
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
          if (clientError) throw clientError;
          
          if (clientData) {
            console.log('Получены данные клиента:', clientData.id);
            // Сохраняем данные клиента
            setClientData(clientData);
            await Promise.all([
              fetchNextWorkout(clientData.id),
              fetchWorkoutStats(clientData.id),
              fetchActivityStats(clientData.id),
              fetchMeasurementStats(clientData.id),
              fetchAchievementsStats(clientData.id)
            ]);
            console.log('Все данные загружены успешно');
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Не удалось загрузить данные');
      } finally {
        console.log('Готовы установить достижения после загрузки данных');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Обновляем достижения при изменении статистики
  useEffect(() => {
    console.log('userStats изменились:', userStats);
    const achievementsData = getAchievements(userStats);
    console.log('Сформированы новые достижения:', achievementsData);
    setAchievements(achievementsData);
    console.log('Достижения обновлены после изменения userStats');
  }, [userStats]);
  
  const fetchDashboardData = async () => {
    // Реализация метода
  };
  
  const fetchNextWorkout = async (clientId: string) => {
    try {
      const now = new Date().toISOString();
      
      // Получаем следующую тренировку без вложенных запросов
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(1);
        
      if (error) throw error;
      
      if (workouts && workouts.length > 0) {
        const workout = workouts[0];
        
        // Если у тренировки есть program_id, получаем информацию о программе отдельным запросом
        if (workout.training_program_id) {
          const { data: programData, error: programError } = await supabase
            .from('training_programs')
            .select('*')
            .eq('id', workout.training_program_id)
            .single();
            
          if (!programError && programData) {
            // Объединяем данные и устанавливаем в состояние
            setNextWorkout({
              ...workout,
              program: programData
            } as NextWorkout);
          } else {
            // Устанавливаем тренировку без программы
            setNextWorkout(workout as NextWorkout);
          }
        } else {
          // Устанавливаем тренировку без программы
          setNextWorkout(workout as NextWorkout);
        }
      }
    } catch (error: any) {
      console.error('Error fetching next workout:', error);
    }
  };
  
  const handleOpenMeasurementsModal = () => {
    setShowMeasurementsModal(true);
  };
  
  const fetchWorkoutStats = async (clientId: string) => {
    try {
      console.log('Загружаем данные о тренировках для клиента:', clientId);
      // Получаем все тренировки клиента
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId);
        
      if (error) throw error;
      console.log('Количество тренировок:', workouts?.length || 0);
      console.log('Данные о тренировках:', workouts);
      
      // Получаем завершенные тренировки (проверяем два возможных формата данных)
      // Вариант 1: используем таблицу workout_completions
      const { data: completions, error: completionsError } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('client_id', clientId);
        
      if (completionsError) throw completionsError;
      console.log('Количество завершенных тренировок из workout_completions:', completions?.length || 0);
      
      // Вариант 2: используем поле completed в таблице workouts
      const { data: completedWorkouts, error: completedWorkoutsError } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId)
        .eq('completed', true);
        
      if (completedWorkoutsError) {
        console.error('Ошибка при получении завершенных тренировок из workouts:', completedWorkoutsError);
      } else {
        console.log('Количество завершенных тренировок из workouts with completed=true:', completedWorkouts?.length || 0);
      }
      
      // Определяем фактическое количество завершенных тренировок на основе доступных данных
      let completedCount = 0;
      
      // Если есть данные в workout_completions, используем их
      if (completions && completions.length > 0) {
        completedCount = completions.length;
        console.log('Используем количество из workout_completions:', completedCount);
      }
      // Иначе если есть данные о завершенных тренировках в workouts, используем их
      else if (completedWorkouts && completedWorkouts.length > 0) {
        completedCount = completedWorkouts.length;
        console.log('Используем количество из workouts с completed=true:', completedCount);
      }
      // Если нет данных ни в одной таблице, устанавливаем 0
      else {
        console.log('Нет данных о завершенных тренировках, устанавливаем 0');
      }
      
      let totalVolume = 0;
      
      // Получаем все упражнения для всех завершенных тренировок
      if (completions && completions.length > 0) {
        // Получаем ID всех завершенных тренировок
        const completedWorkoutIds = completions.map(c => c.workout_id);
        console.log('ID всех завершенных тренировок:', completedWorkoutIds);
        
        // Получаем детали всех завершенных тренировок
        const { data: workoutDetails, error: workoutDetailsError } = await supabase
          .from('workouts')
          .select('*')
          .in('id', completedWorkoutIds);
          
        if (workoutDetailsError) {
          console.error('Ошибка при получении деталей тренировок:', workoutDetailsError);
        } else if (workoutDetails && workoutDetails.length > 0) {
          console.log('Получены детали завершенных тренировок:', workoutDetails.length);
          
          // Собираем ID всех программ тренировок
          const programIds = workoutDetails
            .map(w => w.training_program_id)
            .filter(Boolean);
          console.log('ID программ тренировок:', programIds);
          
          // Получаем упражнения всех программ
          const { data: programExercises, error: programExercisesError } = await supabase
            .from('program_exercises')
            .select(`
              id,
              exercise_id,
              strength_exercises (id, name),
              exercise_sets (set_number, reps, weight)
            `)
            .in('program_id', programIds);
            
          if (programExercisesError) {
            console.error('Ошибка при получении упражнений программ:', programExercisesError);
          } else if (programExercises && programExercises.length > 0) {
            console.log('Получены упражнения программ:', programExercises.length);
            console.log('Детали упражнений программ:', programExercises);
            
            // Получаем все завершенные упражнения клиента
            const { data: exerciseCompletions, error: exerciseError } = await supabase
              .from('exercise_completions')
              .select('*')
              .eq('client_id', clientId)
              .in('workout_id', completedWorkoutIds);
              
            if (exerciseError) {
              console.error('Ошибка при получении завершенных упражнений:', exerciseError);
            } else if (exerciseCompletions && exerciseCompletions.length > 0) {
              console.log('Получены завершенные упражнения:', exerciseCompletions.length);
              
              // Рассчитываем общий объем для всех завершенных упражнений
              exerciseCompletions.forEach(completion => {
                if (completion.completed_sets && Array.isArray(completion.completed_sets)) {
                  // Находим соответствующее упражнение в программе
                  const exercise = programExercises.find(pe => pe.exercise_id === completion.exercise_id);
                  
                  if (exercise) {
                    console.log('Найдено упражнение в программе:', exercise.exercise_id);
                    console.log('Данные упражнения:', exercise);
                    
                    // Проверяем наличие сетов упражнений
                    if (exercise.exercise_sets && Array.isArray(exercise.exercise_sets) && exercise.exercise_sets.length > 0) {
                      console.log('Упражнение содержит сеты:', exercise.exercise_sets.length);
                      
                      // Считаем объем по данным сетов для всех завершенных подходов
                      completion.completed_sets.forEach((isCompleted: boolean, index: number) => {
                        if (isCompleted && index < exercise.exercise_sets.length) {
                          const set = exercise.exercise_sets[index];
                          const reps = parseInt(set.reps, 10) || 0;
                          const weight = parseFloat(set.weight) || 0;
                          
                          console.log(`Подход ${index+1}: повторения=${reps}, вес=${weight}`);
                          
                          if (reps > 0 && weight > 0) {
                            totalVolume += reps * weight;
                            console.log(`Добавлен объем из сета: ${reps * weight} кг, текущий объем: ${totalVolume} кг`);
                          } else {
                            console.log(`Пропущен расчет объема из сета, так как reps=${reps}, weight=${weight}`);
                          }
                        }
                      });
                    } else {
                      console.log('Упражнение не содержит сетов, объем не может быть рассчитан');
                    }
                  }
                }
              });
            }
          }
        }
      }
      
      console.log('Итоговый объем тренировок:', totalVolume);
      console.log('Количество тренировок для обновления:', workouts?.length || 0);
      console.log('Количество завершенных тренировок для обновления:', completedCount);
      
      // Обновляем статистику тренировок - только реальные данные
      const totalCount = workouts?.length || 0;
      
      setUserStats((prev: UserStats) => {
        const newStats = {
          ...prev,
          workouts: {
            totalCount,
            completedCount,
            totalVolume
          }
        };
        console.log('Обновляем статистику тренировок:', newStats);
        return newStats;
      });
    } catch (error) {
      console.error('Error fetching workout stats:', error);
    }
  };
  
  const fetchActivityStats = async (clientId: string) => {
    try {
      // Получаем все активности клиента
      const { data: activities, error } = await supabase
        .from('client_activities')
        .select('*')
        .eq('client_id', clientId);
        
      if (error) throw error;
      
      let totalMinutes = 0;
      const activityTypes: {[key: string]: number} = {};
      
      if (activities) {
        activities.forEach((activity: any) => {
          totalMinutes += activity.duration_minutes;
          
          // Группируем по типам активности
          if (activityTypes[activity.activity_type]) {
            activityTypes[activity.activity_type] += activity.duration_minutes;
          } else {
            activityTypes[activity.activity_type] = activity.duration_minutes;
          }
        });
      }
      
      // Обновляем статистику активности
      setUserStats((prev: UserStats) => ({
        ...prev,
        activities: {
          totalMinutes,
          types: activityTypes
        }
      }));
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  };
  
  const fetchMeasurementStats = async (clientId: string) => {
    try {
      // Получаем все измерения клиента, отсортированные по дате
      const { data: measurements, error } = await supabase
        .from('client_measurements')
        .select('*')
        .eq('client_id', clientId)
        .not('weight', 'is', null)
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      let initialWeight = null;
      let currentWeight = null;
      let weightChange = null;
      
      if (measurements && measurements.length > 0) {
        initialWeight = measurements[0].weight;
        currentWeight = measurements[measurements.length - 1].weight;
        weightChange = currentWeight - initialWeight;
      }
      
      // Обновляем статистику измерений
      setUserStats((prev: UserStats) => ({
        ...prev,
        measurements: {
          initialWeight,
          currentWeight,
          weightChange
        }
      }));
    } catch (error: any) {
      console.error('Error fetching measurement stats:', error);
    }
  };
  
  const fetchAchievementsStats = async (clientId: string) => {
    try {
      // Поскольку таблица achievements не существует, просто устанавливаем значения по умолчанию
      setUserStats((prev: UserStats) => ({
        ...prev,
        achievements: {
          total: 5, // Фиксированное количество возможных достижений
          completed: 0 // Пока нет достижений
        }
      }));
    } catch (error: any) {
      console.error('Error fetching achievements stats:', error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Ошибка при выходе из системы');
    }
  };
  
  const handleMenuItemClick = (action: string) => {
    switch (action) {
      case 'activity':
        navigate('/client/activity/new');
        break;
      case 'photo':
        navigate('/client/progress-photo/new');
        break;
      case 'measurements':
        navigate('/client/measurements/new');
        break;
      case 'nutrition':
        navigate('/client/nutrition/new');
        break;
    }
  };
  
  // Обработчики для свайпа
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };
  
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    // Ограничиваем смещение
    setSwipeOffset(diff);
  };
  
  const handleTouchEnd = () => {
    if (!isSwiping) return;
    
    // Определяем направление свайпа
    if (swipeOffset > 50) {
      // Свайп вправо - предыдущий слайд
      prevSlide();
    } else if (swipeOffset < -50) {
      // Свайп влево - следующий слайд
      nextSlide();
    }
    
    // Сбрасываем состояние
    setIsSwiping(false);
    setSwipeOffset(0);
  };
  
  const menuItems = useClientNavigation(
    showFabMenu,
    setShowFabMenu,
    handleMenuItemClick,
    handleOpenMeasurementsModal
  );
  
  const nextSlide = () => {
    setCurrentSlide((prev: number) => (prev + 1) % achievements.length);
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev: number) => (prev - 1 + achievements.length) % achievements.length);
  };
  
  // Функция для формирования достижений на основе реальных данных
  const getAchievements = (stats: UserStats = userStats): Achievement[] => {
    // Базовые достижения
    const achievements: Achievement[] = [
      {
        title: 'Объем нагрузки',
        description: 'Общий объем нагрузки',
        icon: <Dumbbell className="w-6 h-6" />,
        value: `${stats.workouts.totalVolume.toLocaleString()} кг`,
        color: 'bg-blue-500',
        achievementImage: '/src/assets/achievements/weight.png', // Новый путь для обычных достижений
        motivationalPhrase: 'Каждый килограмм приближает тебя к цели!',
      },
      {
        title: 'Завершенные тренировки',
        description: 'Количество завершенных тренировок',
        icon: <CheckCircle className="w-6 h-6" />,
        value: `${stats.workouts.completedCount}`,
        color: 'bg-green-500',
        achievementImage: '/src/assets/achievements/workout.png', // Новый путь для обычных достижений
        motivationalPhrase: 'Регулярность - ключ к успеху!',
      },
      {
        title: 'Активность',
        description: 'Общее время активности',
        icon: <Activity className="w-6 h-6" />,
        value: `${Math.round(stats.activities.totalMinutes / 60)} часов`,
        color: 'bg-purple-500',
        achievementImage: '/src/assets/achievements/streak.png', // Новый путь для обычных достижений
        motivationalPhrase: 'Движение - это жизнь!',
      },
      {
        title: 'Изменение тела',
        description: stats.measurements.weightChange && stats.measurements.weightChange < 0 
          ? 'Снижение веса' 
          : 'Изменение веса',
        icon: <Scale className="w-6 h-6" />,
        value: stats.measurements.weightChange 
          ? `${Math.abs(stats.measurements.weightChange).toFixed(1)} кг` 
          : 'Нет данных',
        color: 'bg-orange-500',
        achievementImage: '/src/assets/achievements/personal_record.png', // Новый путь для обычных достижений
        motivationalPhrase: stats.measurements.weightChange && stats.measurements.weightChange < 0 
          ? 'Отличный прогресс! Продолжай в том же духе!' 
          : 'Каждый шаг важен на пути к цели!',
      },
      {
        title: 'Любимая активность',
        description: 'Физические упражнения',
        icon: <Activity className="w-16 h-16 text-white" />,
        value: 'Добавь активность',
        color: 'bg-green-500',
        bgImage: '/images/achievements/activity.jpg',
        motivationalPhrase: 'Найди то, что приносит радость, и это уже не будет казаться тренировкой!'
      },
      {
        title: 'Изменение тела',
        description: 'Отслеживание прогресса',
        value: 'Добавь замеры',
        icon: <Scale className="w-16 h-16 text-white" />,
        color: 'bg-purple-500',
        bgImage: '/images/achievements/progress.jpg',
        motivationalPhrase: 'Не сравнивай себя с другими, сравнивай с собой вчерашним!'
      },
      {
        title: 'Общая активность',
        description: 'Суммарное время движения',
        value: 'Добавь активность',
        icon: <Award className="w-16 h-16 text-white" />,
        color: 'bg-yellow-500',
        bgImage: '/images/achievements/trophies.jpg',
        motivationalPhrase: 'Движение - это жизнь. Будь активен каждый день!'
      }
    ];

    // Добавляем остальные достижения
    const fullAchievements = [
      ...achievements,
      {
        title: 'Подними зверя',
        description: 'Объем поднятого веса',
        value: `${stats.workouts.totalVolume} кг`,
        icon: <Scale className="w-16 h-16 text-white" />,
        color: 'bg-pink-500',
        bgImage: '/images/achievements/beast.jpg',
        motivationalPhrase: 'Каждый поднятый килограмм - это новая версия тебя!',
        beastComponent: true
      }
    ];

    return fullAchievements;
  };
  
  // Функция для открытия модального окна поделиться обычным достижением
  const handleShareAchievement = (achievement: Achievement) => {
    // Сохраняем оригинальное значение для отображения в карточке
    const displayValue = achievement.value;
    
    // Извлекаем только числовое значение для расчетов
    let numericValue = parseFloat(achievement.value.replace(/[^\d.-]/g, '')) || 0;
    
    // Определяем единицу измерения на основе типа достижения
    let unit = '';
    if (achievement.title === 'Объем нагрузки') {
      unit = 'кг';
    } else if (achievement.title === 'Любимая активность' || achievement.title === 'Активность') {
      // Для таких достижений единица измерения уже указана в displayValue
      unit = '';
    } else if (achievement.title === 'Изменение тела') {
      unit = 'кг';
    } else if (achievement.title === 'Завершенные тренировки') {
      unit = 'тренировок';
    }
    
    // Формируем имя пользователя
    const userName = clientData 
      ? `${clientData.first_name} ${clientData.last_name}`
      : "Пользователь HARDCASE";
    
    // Если это компонент "Подними зверя", получаем правильные пороговые значения
    let nextThreshold = 0;
    let currentThreshold = 0;
    
    if (achievement.beastComponent) {
      // Найдем соответствующий уровень зверя по имени
      const BEAST_LEVELS = [
        { name: 'Буйвол', threshold: 1500 },
        { name: 'Носорог', threshold: 2000 },
        { name: 'Северный морской слон', threshold: 2500 },
        { name: 'Бегемот', threshold: 3000 },
        { name: 'Морж', threshold: 3500 },
        { name: 'Африканский слон', threshold: 4000 },
        { name: 'Гренландский кит (молодой)', threshold: 4500 },
        { name: 'Южный морской слон', threshold: 5000 },
        { name: 'Кашалот (молодой)', threshold: 5500 },
        { name: 'Китовая акула (молодая)', threshold: 6000 },
        { name: 'Косатка', threshold: 6500 }
      ];
      
      // Находим текущего зверя и следующего по порогу
      const currentBeast = BEAST_LEVELS.find(beast => beast.name === achievement.title) || { name: 'Новичок', threshold: 0 };
      const nextBeast = BEAST_LEVELS.find(beast => beast.threshold > numericValue) || BEAST_LEVELS[BEAST_LEVELS.length - 1];
      
      currentThreshold = currentBeast.threshold;
      nextThreshold = nextBeast.threshold;
    }
    
    setShareModalData({
      isOpen: true,
      userName: userName,
      beastName: achievement.title,
      weightPhrase: achievement.description,
      totalVolume: numericValue,
      nextBeastThreshold: nextThreshold,
      currentBeastThreshold: currentThreshold,
      beastImage: achievement.beastComponent ? achievement.bgImage || '' : '',
      achievementImage: !achievement.beastComponent ? achievement.bgImage || '' : '',
      isBeast: achievement.beastComponent || false,
      displayValue: displayValue,
      unit: unit,
      motivationalPhrase: achievement.motivationalPhrase
    });
  };
  
  // Кастомный компонент топ-бара с добавленным дроп-даун меню
  const CustomHeader = (
    <div className="bg-white shadow-sm">
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold text-gray-800">HARDCASE</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <User className="w-5 h-5 text-gray-600" />
          </button>
          
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/client/achievements');
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                Достижения и прогресс
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  return (
    <SidebarLayout
      menuItems={menuItems}
      variant="bottom"
      customHeader={CustomHeader}
    >
      {/* Full-screen Achievements Slider с поддержкой свайпа и мотивационными фразами */}
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        <div className="relative h-[calc(85vh-16rem)]">
          <div 
            className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
            style={{ 
              transform: isSwiping 
                ? `translateX(calc(-${currentSlide * 100}% + ${swipeOffset}px))` 
                : `translateX(-${currentSlide * 100}%)`
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {achievements.map((achievement, index) => (
              <div 
                key={index}
                className="relative w-full h-full flex-shrink-0"
              >
                {achievement.beastComponent ? (
                  // Рендерим специальный компонент RaiseTheBeastMotivation
                  <div className="h-full flex items-center justify-center overflow-auto py-2">
                    <div className="w-full h-full max-h-[calc(85vh-16rem)] overflow-auto">
                      <RaiseTheBeastMotivation 
                        totalVolume={userStats.workouts.totalVolume} 
                        userName={clientData ? `${clientData.first_name} ${clientData.last_name}` : "Пользователь HARDCASE"} 
                        onShare={handleShareAchievement}
                      />
                    </div>
                  </div>
                ) : (
                  // Стандартный рендеринг для обычных достижений
                  <>
                    {/* Background Image with Overlay */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${achievement.bgImage})` }}
                    >
                      <div className={`absolute inset-0 opacity-90 ${achievement.color}`}></div>
                    </div>

                    {/* Content */}
                    <div className="relative h-full flex flex-col items-center justify-center text-white p-8">
                      <div className="mb-8 flex items-center justify-center">
                        {achievement.icon}
                      </div>
                      
                      <div className="text-center">
                        <div className="text-4xl md:text-6xl font-bold mb-4">
                          {achievement.value}
                        </div>
                        <h3 className="text-xl md:text-3xl font-semibold mb-2">
                          {achievement.title}
                        </h3>
                        <p className="text-base md:text-xl text-white/90 mb-6">
                          {achievement.description}
                        </p>
                        
                        {/* Мотивационная фраза */}
                        <div className="mt-4 bg-white/20 rounded-lg p-4 backdrop-blur-sm max-w-lg mx-auto">
                          <p className="text-base md:text-lg italic text-white/95">
                            "{achievement.motivationalPhrase}"
                          </p>
                        </div>
                        
                        {/* Кнопка поделиться */}
                        <div className="mt-6">
                          <button
                            onClick={() => handleShareAchievement(achievement)}
                            className="p-3 bg-white/30 rounded-full hover:bg-white/50 transition-colors touch-manipulation backdrop-blur-sm"
                            aria-label="Поделиться достижением"
                          >
                            <BarChart2 className="w-6 h-6 text-white drop-shadow-md" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[#606060]/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#606060]/30 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[#606060]/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#606060]/30 transition-colors"
          >
            <ArrowRight className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </button>

          {/* Dots Navigation */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3">
            {achievements.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors ${
                  currentSlide === index 
                    ? 'bg-white' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Next Workout Card */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Моя следующая тренировка</h2>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <button
            onClick={() => {
              console.log('Opening workout details with data:', nextWorkout);
              // Проверяем, что у нас есть все необходимые данные для отображения
              if (!nextWorkout || !nextWorkout.id) {
                console.error('Invalid workout data:', nextWorkout);
                toast.error('Не удалось открыть тренировку. Данные отсутствуют или повреждены.');
                return;
              }
              // Вместо открытия модального окна переходим на страницу деталей тренировки
              navigate(`/client/workouts/${nextWorkout.id}`);
            }}
            className="w-full flex items-center justify-between p-4 bg-[#dddddd] rounded-lg hover:bg-[#d0d0d0] transition-colors"
          >
            <div className="flex items-center">
              <Dumbbell className="w-7.5 h-7.5 text-[#ff8502] mr-3" />
              <div>
                {nextWorkout ? (
                  <>
                    <p className="font-medium text-left">{nextWorkout.title}</p>
                    <p className="text-sm text-[#606060] mt-1">
                      {new Date(nextWorkout.start_time).toLocaleString('ru-RU', {
                        weekday: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-left">Нет запланированных тренировок</p>
                    <p className="text-sm text-[#606060] mt-1">Записаться на тренировку</p>
                  </>
                )}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#606060]" />
          </button>
        )}
      </div>

      {/* Measurements Input Modal */}
      {showMeasurementsModal && (
        <MeasurementsInputModal
          isOpen={showMeasurementsModal}
          onClose={() => setShowMeasurementsModal(false)}
          onSave={() => {
            setShowMeasurementsModal(false);
            toast.success('Замеры сохранены');
          }}
        />
      )}

      {/* Share Achievement Modal */}
      {shareModalData && (
        <ShareAchievementModal
          isOpen={shareModalData.isOpen}
          onClose={() => setShareModalData(null)}
          userName={shareModalData.userName}
          beastName={shareModalData.beastName}
          weightPhrase={shareModalData.weightPhrase}
          totalVolume={shareModalData.totalVolume}
          nextBeastThreshold={shareModalData.nextBeastThreshold}
          currentBeastThreshold={shareModalData.currentBeastThreshold}
          beastImage={shareModalData.beastImage}
          achievementImage={shareModalData.achievementImage}
          isBeast={shareModalData.isBeast}
          displayValue={shareModalData.displayValue}
          unit={shareModalData.unit}
          motivationalPhrase={shareModalData.motivationalPhrase}
        />
      )}
    </SidebarLayout>
  );
}