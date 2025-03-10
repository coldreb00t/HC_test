import React, { useState, useEffect, TouchEvent } from 'react';
import { 
  Dumbbell, 
  Activity,
  //Plus,
  //Camera,
  //X,
  //Apple,
  Scale,
  //Heart,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Calendar,
  //Moon,
  //Droplets,
  //Home,
  User,
  LogOut,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';
import { useClientNavigation } from '../lib/navigation';
import { WorkoutProgramModal } from './WorkoutProgramModal';
import { MeasurementsInputModal } from './MeasurementsInputModal';
import { Exercise, Program, Workout } from '../types/workout';
import type { ReactNode } from 'react';

// Переименовываем интерфейс, чтобы избежать конфликта с импортированным типом
interface NextWorkout extends Workout {}

// Расширенный интерфейс достижения с мотивационной фразой
interface Achievement {
  title: string;
  description: string;
  icon: ReactNode;
  value: string;
  color: string;
  bgImage?: string;
  motivationalPhrase: string; // Добавлено поле для мотивационной фразы
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
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
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
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
          if (clientError) throw clientError;
          
          if (clientData) {
            await Promise.all([
              fetchNextWorkout(clientData.id),
              fetchWorkoutStats(clientData.id),
              fetchActivityStats(clientData.id),
              fetchMeasurementStats(clientData.id),
              fetchAchievementsStats(clientData.id)
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Устанавливаем достижения
    setAchievements(getAchievements());
  }, []);
  
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
      // Получаем все тренировки клиента
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId);
        
      if (error) throw error;
      
      // Получаем завершенные тренировки
      const { data: completions, error: completionsError } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('client_id', clientId);
        
      if (completionsError) throw completionsError;
      
      // Получаем завершенные упражнения для расчета объема
      const { data: exerciseCompletions, error: exerciseError } = await supabase
        .from('exercise_completions')
        .select('*')
        .eq('client_id', clientId);
        
      if (exerciseError) throw exerciseError;
      
      let totalVolume = 0;
      
      if (exerciseCompletions && exerciseCompletions.length > 0) {
        // Получаем данные о подходах для расчета объема
        const workoutIds = completions?.map((c: any) => c.workout_id) || [];
        
        const { data: workoutDetails } = await supabase
          .from('workouts')
          .select('*')
          .in('id', workoutIds);
        
        const programIds = workoutDetails
          ?.map((w: any) => w.training_program_id)
          .filter(Boolean) || [];
        
        const { data: programExercises } = await supabase
          .from('program_exercises')
          .select(`
            *
          `)
          .in('program_id', programIds);
        
        // Подсчет общего объема
        if (programExercises) {
          exerciseCompletions.forEach((completion: any) => {
            if (completion.completed_sets && Array.isArray(completion.completed_sets)) {
              const exercise = programExercises.find((pe: any) => pe.exercise_id === completion.exercise_id);
              
              if (exercise) {
                // Используем информацию о подходах из таблицы program_exercises
                // Так как в таблице program_exercises нет поля exercise_sets,
                // мы используем информацию о подходах из самой записи
                completion.completed_sets.forEach((isCompleted: boolean, index: number) => {
                  if (isCompleted) {
                    // Рассчитываем объем на основе доступных данных
                    // Если в базе данных есть sets, reps и weight, используем их
                    // В противном случае используем значения по умолчанию или пропускаем
                    const sets = exercise.sets || 0;
                    const reps = parseInt(exercise.reps, 10) || 0;
                    const weight = parseFloat(exercise.weight) || 0;
                    
                    if (sets > 0 && reps > 0 && weight > 0) {
                      totalVolume += reps * weight;
                    }
                  }
                });
              }
            }
          });
        }
      }
      
      // Обновляем статистику тренировок
      setUserStats((prev: UserStats) => ({
        ...prev,
        workouts: {
          totalCount: workouts?.length || 0,
          completedCount: completions?.length || 0,
          totalVolume
        }
      }));
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
  const getAchievements = (): Achievement[] => {
    return [
      {
        title: 'Тренировки',
        description: 'Общее количество тренировок',
        value: userStats.workouts.totalCount.toString(),
        icon: <Dumbbell className="w-16 h-16 text-white" />,
        color: 'bg-orange-500',
        bgImage: '/images/achievements/workouts.jpg',
        motivationalPhrase: 'Каждая тренировка приближает тебя к цели!'
      },
      {
        title: 'Объем',
        description: 'Общий объем поднятого веса',
        value: `${userStats.workouts.totalVolume.toLocaleString()} кг`,
        icon: <Dumbbell className="w-16 h-16 text-white" />,
        color: 'bg-blue-500',
        bgImage: '/images/achievements/volume.jpg',
        motivationalPhrase: 'Сила не приходит из того, что ты можешь делать. Она приходит из преодоления того, что ты не можешь.'
      },
      {
        title: 'Активность',
        description: 'Общее время активности',
        value: `${Math.floor(userStats.activities.totalMinutes / 60)} ч ${userStats.activities.totalMinutes % 60} мин`,
        icon: <Activity className="w-16 h-16 text-white" />,
        color: 'bg-green-500',
        bgImage: '/images/achievements/activity.jpg',
        motivationalPhrase: 'Твое тело может все. Это твой разум нужно убедить.'
      },
      {
        title: 'Прогресс',
        description: userStats.measurements.weightChange && userStats.measurements.weightChange < 0 
          ? 'Снижение веса' 
          : 'Набор массы',
        value: userStats.measurements.weightChange 
          ? `${Math.abs(userStats.measurements.weightChange).toFixed(1)} кг` 
          : '0 кг',
        icon: <Scale className="w-16 h-16 text-white" />,
        color: 'bg-purple-500',
        bgImage: '/images/achievements/progress.jpg',
        motivationalPhrase: 'Не останавливайся, когда устал. Остановись, когда закончил.'
      },
      {
        title: 'Достижения',
        description: 'Разблокированные достижения',
        value: `${userStats.achievements.completed}/${userStats.achievements.total}`,
        icon: <Trophy className="w-16 h-16 text-white" />,
        color: 'bg-yellow-500',
        bgImage: '/images/achievements/trophies.jpg',
        motivationalPhrase: 'Успех — это сумма небольших усилий, повторяющихся изо дня в день.'
      }
    ];
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
                <TrendingUp className="w-4 h-4 mr-2" />
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
                {/* Background Image with Overlay */}
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${achievement.bgImage})` }}
                >
                  <div className={`absolute inset-0 opacity-90 ${achievement.color}`}></div>
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col items-center justify-center text-white p-8">
                  <div className="mb-8">
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[#606060]/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#606060]/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[#606060]/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#606060]/30 transition-colors"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-white" />
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
            onClick={() => setShowWorkoutModal(true)}
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
            <ChevronRight className="w-5 h-5 text-[#606060]" />
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

      {/* Workout Program Modal */}
      {showWorkoutModal && nextWorkout && (
        <WorkoutProgramModal
          isOpen={showWorkoutModal}
          onClose={() => setShowWorkoutModal(false)}
          program={nextWorkout.program}
          title={nextWorkout.title}
          time={new Date(nextWorkout.start_time).toLocaleString('ru-RU', {
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit'
          })}
          training_program_id={nextWorkout.training_program_id}
        />
      )}
    </SidebarLayout>
  );
}