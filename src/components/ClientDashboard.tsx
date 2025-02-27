import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Activity,
  Plus,
  Camera,
  X,
  Apple,
  Scale,
  Heart,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Calendar,
  Moon,
  Droplets,
  Home,
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

interface Exercise {
  id: string;
  name: string;
  description?: string;
  video_url?: string;
  sets: {
    set_number: number;
    reps: string;
    weight: string;
  }[];
  notes?: string;
}

interface Program {
  id: string;
  title: string;
  description?: string;
  exercises: Exercise[];
}

interface NextWorkout {
  id: string;
  start_time: string;
  title: string;
  training_program_id?: string;
  program?: Program | null;
}

// Расширенный интерфейс достижения с мотивационной фразой
interface Achievement {
  title: string;
  description: string;
  icon: React.ReactNode;
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

export function ClientDashboard() {
  const navigate = useNavigate();
  const [nextWorkout, setNextWorkout] = useState<NextWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  
  // Состояние для хранения статистики
  const [userStats, setUserStats] = useState<UserStats>({
    workouts: { totalCount: 0, completedCount: 0, totalVolume: 0 },
    activities: { totalMinutes: 0, types: {} },
    measurements: { currentWeight: null, initialWeight: null, weightChange: null },
    achievements: { total: 5, completed: 0 }
  });
  
  // Состояния для обработки свайпа
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Минимальное расстояние свайпа для смены слайда (в пикселях)
  const minSwipeDistance = 50;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Обновленная функция для загрузки данных дашборда
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        if (userError) console.error('Auth error:', userError);
        toast.error('Ошибка аутентификации. Пожалуйста, войдите в систему заново.');
        navigate('/login');
        return;
      }

      // Получаем профиль клиента
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) {
        if (clientError.code === 'PGRST116') {
          toast.error('Профиль клиента не найден');
          return;
        }
        throw clientError;
      }

      // Одновременно загружаем все данные через Promise.all
      await Promise.all([
        fetchNextWorkout(clientData.id),
        fetchWorkoutStats(clientData.id),
        fetchActivityStats(clientData.id),
        fetchMeasurementStats(clientData.id)
      ]);
      
      // Подсчет достижений должен идти после того, как другие данные загружены
      await fetchAchievementsStats(clientData.id);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error.message === 'Failed to fetch') {
        toast.error('Ошибка подключения к серверу. Пожалуйста, проверьте подключение к интернету.');
      } else {
        toast.error('Ошибка при загрузке данных');
      }
    } finally {
      setLoading(false);
    }
  };

  // Функция для получения данных о следующей тренировке
  const fetchNextWorkout = async (clientId: string) => {
    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .select('id, start_time, title, training_program_id')
      .eq('client_id', clientId)
      .gt('start_time', new Date().toISOString())
      .order('start_time')
      .limit(1)
      .single();

    if (workoutError && workoutError.code !== 'PGRST116') throw workoutError;

    if (workoutData) {
      setNextWorkout({
        id: workoutData.id,
        start_time: workoutData.start_time,
        title: workoutData.title,
        training_program_id: workoutData.training_program_id,
        program: null
      });
    } else {
      setNextWorkout(null);
    }
  };

  // Функция для получения статистики тренировок
  const fetchWorkoutStats = async (clientId: string) => {
    try {
      // Получаем тренировки клиента
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, start_time')
        .eq('client_id', clientId);

      if (workoutsError) throw workoutsError;

      // Получаем завершенные тренировки
      const { data: completions, error: completionsError } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('client_id', clientId)
        .eq('completed', true);

      if (completionsError) throw completionsError;

      // Получаем выполненные упражнения для расчета общего объема
      const { data: exerciseCompletions, error: exerciseError } = await supabase
        .from('exercise_completions')
        .select('*')
        .eq('client_id', clientId);

      if (exerciseError) throw exerciseError;

      // Расчет общего объема тренировок (вес × повторения)
      let totalVolume = 0;

      if (exerciseCompletions && exerciseCompletions.length > 0) {
        // Получаем данные о подходах для расчета объема
        const workoutIds = completions?.map(c => c.workout_id) || [];
        
        const { data: workoutDetails } = await supabase
          .from('workouts')
          .select('id, training_program_id')
          .in('id', workoutIds);
        
        const programIds = workoutDetails
          ?.map(w => w.training_program_id)
          .filter(Boolean) || [];
        
        const { data: programExercises } = await supabase
          .from('program_exercises')
          .select(`
            exercise_id,
            exercise_sets (set_number, reps, weight)
          `)
          .in('program_id', programIds);
        
        // Подсчет общего объема
        if (programExercises) {
          exerciseCompletions.forEach(completion => {
            if (completion.completed_sets && Array.isArray(completion.completed_sets)) {
              const exercise = programExercises.find(pe => pe.exercise_id === completion.exercise_id);
              
              if (exercise && exercise.exercise_sets) {
                completion.completed_sets.forEach((isCompleted, index) => {
                  if (isCompleted && exercise.exercise_sets[index]) {
                    const set = exercise.exercise_sets[index];
                    // Парсим повторения (может быть диапазон "8-12")
                    let reps = 0;
                    if (set.reps) {
                      const repsStr = set.reps.toString();
                      if (repsStr.includes('-')) {
                        const [min, max] = repsStr.split('-').map(Number);
                        reps = Math.round((min + max) / 2);
                      } else {
                        reps = parseInt(repsStr) || 0;
                      }
                    }
                    
                    // Парсим вес
                    const weight = parseFloat(set.weight || '0') || 0;
                    
                    // Добавляем к общему объему
                    totalVolume += reps * weight;
                  }
                });
              }
            }
          });
        }
      }

      // Обновляем статистику тренировок
      setUserStats(prev => ({
        ...prev,
        workouts: {
          totalCount: workouts?.length || 0,
          completedCount: completions?.length || 0,
          totalVolume: Math.round(totalVolume) // Округляем до целого числа кг
        }
      }));
    } catch (error) {
      console.error('Error fetching workout stats:', error);
    }
  };

  // Функция для получения статистики активности
  const fetchActivityStats = async (clientId: string) => {
    try {
      // Получаем данные о бытовой активности
      const { data: activities, error: activitiesError } = await supabase
        .from('client_activities')
        .select('*')
        .eq('client_id', clientId);

      if (activitiesError) throw activitiesError;

      // Подсчет общего времени и группировка по типам
      let totalMinutes = 0;
      const activityTypes: {[key: string]: number} = {};

      if (activities) {
        activities.forEach(activity => {
          totalMinutes += activity.duration_minutes;
          
          // Группируем по типам активности
          if (!activityTypes[activity.activity_type]) {
            activityTypes[activity.activity_type] = 0;
          }
          activityTypes[activity.activity_type] += activity.duration_minutes;
        });
      }

      // Обновляем статистику активности
      setUserStats(prev => ({
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

  // Функция для получения статистики измерений
  const fetchMeasurementStats = async (clientId: string) => {
    try {
      // Получаем данные о замерах, отсортированные по дате
      const { data: measurements, error: measurementsError } = await supabase
        .from('client_measurements')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: true });

      if (measurementsError) throw measurementsError;

      // Вычисляем начальный и текущий вес, а также изменение
      let initialWeight = null;
      let currentWeight = null;
      let weightChange = null;

      if (measurements && measurements.length > 0) {
        initialWeight = measurements[0].weight;
        currentWeight = measurements[measurements.length - 1].weight;
        
        if (initialWeight !== null && currentWeight !== null) {
          weightChange = currentWeight - initialWeight;
        }
      }

      // Обновляем статистику измерений
      setUserStats(prev => ({
        ...prev,
        measurements: {
          initialWeight,
          currentWeight,
          weightChange
        }
      }));
    } catch (error) {
      console.error('Error fetching measurement stats:', error);
    }
  };

  // Функция для получения статистики достижений
  const fetchAchievementsStats = async (clientId: string) => {
    try {
      // Здесь можно получить достижения из базы данных
      // Пока используем простую логику на основе уже полученных данных
      
      // Считаем количество выполненных достижений на основе статистики
      let completedAchievements = 0;
      
      // Добавляем логику подсчета достижений
      // Например, если пользователь выполнил хотя бы 5 тренировок
      if (userStats.workouts.completedCount >= 5) completedAchievements++;
      
      // Если суммарный объем тренировок больше 1000 кг
      if (userStats.workouts.totalVolume >= 1000) completedAchievements++;
      
      // Если общее время активности больше 10 часов (600 минут)
      if (userStats.activities.totalMinutes >= 600) completedAchievements++;
      
      // Если есть измерения веса
      if (userStats.measurements.currentWeight !== null) completedAchievements++;
      
      // Если есть снижение веса (для целей похудения)
      if (userStats.measurements.weightChange !== null && 
          userStats.measurements.weightChange < 0) completedAchievements++;
      
      // Обновляем статистику достижений
      setUserStats(prev => ({
        ...prev,
        achievements: {
          total: 5, // Фиксированное количество возможных достижений
          completed: completedAchievements
        }
      }));
    } catch (error) {
      console.error('Error calculating achievements stats:', error);
    }
  };
  
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Ошибка при выходе из системы');
    }
  };

  const handleMenuItemClick = (action: string) => {
    setShowFabMenu(false);
    switch (action) {
      case 'activity':
        navigate('/client/activity/new');
        break;
      case 'photo':
        navigate('/client/progress-photo/new');
        break;
      case 'measurements':
        setShowMeasurementsModal(true); // Open measurements modal instead of navigating
        break;
      case 'nutrition':
        navigate('/client/nutrition/new');
        break;
    }
  };

  // Обработчики свайпа
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentPosition = e.targetTouches[0].clientX;
    setTouchEnd(currentPosition);
    
    // Расчет смещения для анимации во время свайпа
    const offset = currentPosition - touchStart;
    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }
    
    const distance = touchEnd - touchStart;
    const isLeftSwipe = distance < -minSwipeDistance;
    const isRightSwipe = distance > minSwipeDistance;
    
    if (isLeftSwipe) {
      // Свайп влево - следующий слайд
      nextSlide();
    } else if (isRightSwipe) {
      // Свайп вправо - предыдущий слайд
      prevSlide();
    }
    
    // Сброс позиций касания
    setTouchStart(null);
    setTouchEnd(null);
    setSwipeOffset(0);
  };

  const menuItems = useClientNavigation(showFabMenu, setShowFabMenu, handleMenuItemClick);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % achievements.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + achievements.length) % achievements.length);
  };

  // Функция для формирования достижений на основе реальных данных
  const getAchievements = (): Achievement[] => {
    return [
      {
        title: "Тренировки",
        description: "Выполнено тренировок",
        icon: <Dumbbell className="w-12 h-12 text-white" />,
        value: `${userStats.workouts.completedCount}`,
        color: "bg-[#ff8502]",
        bgImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80",
        motivationalPhrase: userStats.workouts.completedCount > 0 
          ? "Каждая тренировка — это шаг к лучшей версии себя!" 
          : "Начни свой путь к трансформации прямо сейчас!"
      },
      {
        title: "Общий вес",
        description: "Суммарная нагрузка",
        icon: <Scale className="w-12 h-12 text-white" />,
        value: `${userStats.workouts.totalVolume} кг`,
        color: "bg-[#606060]",
        bgImage: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80",
        motivationalPhrase: userStats.workouts.totalVolume > 0 
          ? "Сила растет с каждым поднятым килограммом!" 
          : "Впереди миллионы килограммов, которые сделают тебя сильнее!"
      },
      {
        title: "Активность",
        description: "Время в движении",
        icon: <Activity className="w-12 h-12 text-white" />,
        value: `${Math.floor(userStats.activities.totalMinutes / 60)} ч ${userStats.activities.totalMinutes % 60} мин`,
        color: "bg-[#ff8502]",
        bgImage: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&q=80",
        motivationalPhrase: userStats.activities.totalMinutes > 0 
          ? "Движение — это жизнь, и каждая минута активности делает тебя здоровее!" 
          : "Начни двигаться сегодня — и твоё тело скажет спасибо завтра!"
      },
      {
        title: "Прогресс веса",
        description: userStats.measurements.weightChange !== null 
          ? userStats.measurements.weightChange < 0 
            ? "Снижение веса" 
            : "Изменение веса" 
          : "Отслеживание веса",
        icon: <TrendingUp className="w-12 h-12 text-white" />,
        value: userStats.measurements.weightChange !== null 
          ? `${Math.abs(userStats.measurements.weightChange).toFixed(1)} кг ${userStats.measurements.weightChange < 0 ? '↓' : '↑'}` 
          : "Нет данных",
        color: "bg-[#606060]",
        bgImage: "https://images.unsplash.com/photo-1526401485004-46910ecc8e51?auto=format&fit=crop&q=80",
        motivationalPhrase: userStats.measurements.weightChange !== null 
          ? userStats.measurements.weightChange < 0 
            ? "Отличный прогресс! Продолжай двигаться к своей цели!" 
            : "Твоё тело меняется. Помни, что мышцы весят больше жира!" 
          : "Начни отслеживать изменения тела — и увидишь свой прогресс!"
      },
      {
        title: "Достижения",
        description: "Выполненные цели",
        icon: <Trophy className="w-12 h-12 text-white" />,
        value: `${userStats.achievements.completed}/${userStats.achievements.total}`,
        color: "bg-[#ff8502]",
        bgImage: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80",
        motivationalPhrase: userStats.achievements.completed > 0 
          ? "Каждое достижение — это победа над собой вчерашним!" 
          : "Ставь цели и достигай их. Путь к успеху начинается с первого шага!"
      }
    ];
  };

  // Получаем актуальные достижения
  const achievements = getAchievements();

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
      // Optionally refresh data after saving measurements
      fetchDashboardData();
    }}
  />
)}
      {/* Workout Program Modal */}
      {nextWorkout && showWorkoutModal && (
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