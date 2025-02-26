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

interface Achievement {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: string;
  color: string;
  bgImage?: string;
}

export function ClientDashboard() {
  const navigate = useNavigate();
  const [nextWorkout, setNextWorkout] = useState<NextWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Auth error:', userError);
        toast.error('Ошибка аутентификации. Пожалуйста, войдите в систему заново.');
        navigate('/login');
        return;
      }

      if (!user) {
        toast.error('Пожалуйста, войдите в систему');
        navigate('/login');
        return;
      }

      // Get client profile
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

      // Get next workout
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('id, start_time, title, training_program_id')
        .eq('client_id', clientData.id)
        .gt('start_time', new Date().toISOString())
        .order('start_time')
        .limit(1)
        .single();

      if (workoutError && workoutError.code !== 'PGRST116') throw workoutError;

      if (workoutData) {
        // Создаем базовую информацию о тренировке без загрузки программы
        // Программа будет загружена непосредственно в модальном окне
        setNextWorkout({
          id: workoutData.id,
          start_time: workoutData.start_time,
          title: workoutData.title,
          training_program_id: workoutData.training_program_id,
          program: null // Устанавливаем null, программа будет загружена в модальном окне по требованию
        });
      } else {
        setNextWorkout(null);
      }
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
        navigate('/client/measurements/new');
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

  const achievements: Achievement[] = [
    {
      title: "Тренировки",
      description: "Количество тренировок за месяц",
      icon: <Dumbbell className="w-12 h-12 text-white" />,
      value: "12",
      color: "bg-[#ff8502]",
      bgImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80"
    },
    {
      title: "Общий вес",
      description: "Суммарный вес на тренировках",
      icon: <Scale className="w-12 h-12 text-white" />,
      value: "1500 кг",
      color: "bg-[#606060]",
      bgImage: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80"
    },
    {
      title: "Активность",
      description: "Минуты активности за месяц",
      icon: <Activity className="w-12 h-12 text-white" />,
      value: "960 мин",
      color: "bg-[#ff8502]",
      bgImage: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&q=80"
    },
    {
      title: "Достижения",
      description: "Выполненные цели",
      icon: <Trophy className="w-12 h-12 text-white" />,
      value: "3/5",
      color: "bg-[#606060]",
      bgImage: "https://images.unsplash.com/photo-1526401485004-46910ecc8e51?auto=format&fit=crop&q=80"
    }
  ];

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
      {/* Full-screen Achievements Slider с поддержкой свайпа */}
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
                    <p className="text-base md:text-xl text-white/90">
                      {achievement.description}
                    </p>
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