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
  ChevronDown
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
  bgImage?: string;
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
        setLoading(true);
        
        // Получаем данные текущего пользователя
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Получаем данные клиента по user_id
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
            
            // Используем улучшенный API с кэшированием для загрузки всех данных дашборда
            try {
              const dashboardData = await loadDashboardData(clientData.id);
              
              // Устанавливаем полученные данные
              if (dashboardData.nextWorkout) {
                setNextWorkout(dashboardData.nextWorkout);
              }
              
              setUserStats(prevStats => ({
                ...prevStats,
                workouts: {
                  totalCount: dashboardData.workoutStats?.totalCount || 0,
                  completedCount: dashboardData.workoutStats?.completedCount || 0,
                  totalVolume: dashboardData.workoutStats?.totalVolume || 0
                },
                activities: {
                  totalMinutes: dashboardData.activityStats?.totalMinutes || 0,
                  types: dashboardData.activityStats?.types || {}
                },
                measurements: {
                  currentWeight: dashboardData.measurementStats?.currentWeight,
                  initialWeight: dashboardData.measurementStats?.initialWeight,
                  weightChange: dashboardData.measurementStats?.weightChange
                }
              }));
              
              // Отдельно загружаем статистику достижений, так как она не включена в loadDashboardData
              const achievementsStats = await fetchAchievementsStats(clientData.id);
              setUserStats(prevStats => ({
                ...prevStats,
                achievements: achievementsStats
              }));
              
              console.log('Все данные загружены успешно');
            } catch (error) {
              console.error('Ошибка при загрузке данных дашборда:', error);
              toast.error('Не удалось загрузить данные дашборда');
            }
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
  
  // Обработчик открытия модального окна с измерениями
  const handleOpenMeasurementsModal = () => {
    setShowMeasurementsModal(true);
  };
  
  // Получение статистики достижений
  const fetchAchievementsStats = async (_clientId: string) => {
    // Используем underscore для неиспользуемого параметра
    try {
      console.log('Загрузка статистики достижений...');
      
      // Вместо пустых значений по умолчанию, создадим более интересные демонстрационные данные
      // В реальном приложении здесь будет запрос к таблице достижений
      
      // Пример расчета выполненных достижений на основе текущих данных пользователя
      const achievedCount = [
        userStats.workouts.completedCount > 0, // Есть хотя бы одна завершенная тренировка
        userStats.workouts.totalVolume > 0,   // Есть объем тренировок
        Object.keys(userStats.activities.types).length > 0, // Есть активности
        userStats.measurements.weightChange !== null, // Есть измерения веса
        userStats.activities.totalMinutes > 0 // Есть общее время активности
      ].filter(Boolean).length;
      
      const result = {
        total: 5, // Фиксированное количество возможных достижений
        completed: achievedCount
      };
      
      console.log('Посчитана статистика достижений:', result);
      return result;
    } catch (error) {
      console.error('Error fetching achievements stats:', error);
      return {
        total: 5,
        completed: 0
      };
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
    console.log('Формируем достижения на основе данных:', stats);
    console.log('Количество тренировок:', stats.workouts.totalCount);
    console.log('Количество завершенных тренировок:', stats.workouts.completedCount);
    console.log('Объем тренировок:', stats.workouts.totalVolume);
    
    // Получаем наиболее популярный тип активности
    let topActivityType = 'Физические упражнения';
    let topActivityDuration = 0;
    
    Object.entries(stats.activities.types).forEach(([type, duration]) => {
      if (duration > topActivityDuration) {
        topActivityType = type;
        topActivityDuration = duration;
      }
    });
    
    console.log('Самый популярный тип активности:', topActivityType, topActivityDuration);
    
    // Просто число завершенных тренировок
    const completedTrainingsValue = stats.workouts.completedCount > 0 
      ? stats.workouts.completedCount.toString() 
      : '0';
    console.log('Значение для отображения в достижении "Завершенные тренировки":', completedTrainingsValue);
    
    // Число с единицей измерения для общего объема нагрузки
    const totalVolumeValue = stats.workouts.totalVolume > 0 
      ? `${stats.workouts.totalVolume} кг` 
      : '0 кг';
    console.log('Значение для отображения в достижении "Объем нагрузки":', totalVolumeValue);
    
    return [
      {
        title: 'Завершенные тренировки',
        description: 'Регулярность - ключ к результатам',
        value: completedTrainingsValue,
        icon: <Calendar className="w-16 h-16 text-white" />,
        color: 'bg-orange-500',
        bgImage: '/images/achievements/workouts.jpg',
        motivationalPhrase: 'Регулярные тренировки сделают невозможное возможным!'
      },
      {
        title: 'Объем нагрузки',
        description: 'Общий вес, который ты поднял',
        value: totalVolumeValue,
        icon: <Dumbbell className="w-16 h-16 text-white" />,
        color: 'bg-blue-500',
        bgImage: '/images/achievements/volume.jpg',
        motivationalPhrase: 'Каждый поднятый килограмм приближает тебя к цели!'
      },
      {
        title: 'Любимая активность',
        description: topActivityType,
        value: topActivityDuration > 0
          ? `${Math.floor(topActivityDuration / 60)} ч ${topActivityDuration % 60} мин`
          : 'Добавь активность',
        icon: <Activity className="w-16 h-16 text-white" />,
        color: 'bg-green-500',
        bgImage: '/images/achievements/activity.jpg',
        motivationalPhrase: 'Найди то, что приносит радость, и это уже не будет казаться тренировкой!'
      },
      {
        title: 'Изменение тела',
        description: stats.measurements.weightChange && stats.measurements.weightChange < 0 
          ? 'Снижение веса' 
          : stats.measurements.weightChange && stats.measurements.weightChange > 0 
            ? 'Набор массы' 
            : 'Изменение веса',
        value: stats.measurements.weightChange 
          ? `${Math.abs(stats.measurements.weightChange).toFixed(1)} кг` 
          : 'Добавь замеры',
        icon: <Scale className="w-16 h-16 text-white" />,
        color: 'bg-purple-500',
        bgImage: '/images/achievements/progress.jpg',
        motivationalPhrase: 'Не сравнивай себя с другими, сравнивай с собой вчерашним!'
      },
      // Пятое достижение - общая активность
      {
        title: 'Общая активность',
        description: 'Суммарное время движения',
        value: stats.activities.totalMinutes > 0 
          ? `${Math.floor(stats.activities.totalMinutes / 60)} ч ${stats.activities.totalMinutes % 60} мин` 
          : 'Добавь активность',
        icon: <Award className="w-16 h-16 text-white" />,
        color: 'bg-yellow-500',
        bgImage: '/images/achievements/trophies.jpg',
        motivationalPhrase: 'Движение - это жизнь. Будь активен каждый день!'
      },
      {
        title: 'Подними зверя',
        description: 'Объем поднятого веса',
        value: stats.workouts.totalVolume > 0 
          ? `${stats.workouts.totalVolume} кг` 
          : '0 кг',
        icon: <Scale className="w-16 h-16 text-white" />,
        color: 'bg-pink-500',
        bgImage: '/images/achievements/beast.jpg',
        motivationalPhrase: 'Каждый поднятый килограмм - это новая версия тебя!',
        beastComponent: true
      }
    ];
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
      beastImage: achievement.bgImage || '',
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
          isBeast={shareModalData.isBeast}
          displayValue={shareModalData.displayValue}
          unit={shareModalData.unit}
          motivationalPhrase={shareModalData.motivationalPhrase}
        />
      )}
    </SidebarLayout>
  );
}