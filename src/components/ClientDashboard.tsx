import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Activity,
  Bell,
  Plus,
  Camera,
  X,
  Apple,
  Target,
  Scale,
  Heart,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Calendar,
  User,
  LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';

interface Achievement {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: string;
  color: string;
  bgImage?: string;
}

interface NextWorkout {
  id: string;
  start_time: string;
  title: string;
}

export function ClientDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [nextWorkout, setNextWorkout] = useState<NextWorkout | null>(null);
  const [userProfile, setUserProfile] = useState<{firstName: string; lastName: string} | null>(null);

  // Enhanced achievements data with brand colors
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
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

      const { data: clientData, error: clientError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError) {
        if (clientError.code === 'PGRST116') {
          toast.error('Профиль клиента не найден');
          return;
        }
        throw clientError;
      }

      if (clientData.next_workout) {
        setNextWorkout(clientData.next_workout);
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

  const handleFabClick = () => {
    setShowFabMenu(!showFabMenu);
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

  const menuItems = [
    {
      icon: <Dumbbell className="w-7.5 h-7.5" />,
      label: '',
      onClick: () => navigate('/client/workouts')
    },
    {
      icon: <Activity className="w-7.5 h-7.5" />,
      label: '',
      onClick: () => navigate('/client/activity')
    },
    {
      icon: (
        <div className="relative -mt-8">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              handleFabClick();
            }}
            className="w-14 h-14 bg-[#ff8502] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#ff9933] transition-colors cursor-pointer"
          >
            {showFabMenu ? (
              <X className="w-7.5 h-7.5" />
            ) : (
              <Plus className="w-7.5 h-7.5" />
            )}
          </div>
          {showFabMenu && (
            <div className="absolute bottom-16 -left-24 bg-white rounded-lg shadow-lg overflow-hidden w-48">
              <div className="py-2">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuItemClick('activity');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#dddddd] flex items-center space-x-2 cursor-pointer"
                >
                  <Activity className="w-5 h-5 text-[#ff8502]" />
                  <span>Активность</span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuItemClick('photo');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#dddddd] flex items-center space-x-2 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-[#606060]" />
                  <span>Фото прогресса</span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuItemClick('measurements');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#dddddd] flex items-center space-x-2 cursor-pointer"
                >
                  <Scale className="w-5 h-5 text-[#ff8502]" />
                  <span>Замеры</span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuItemClick('nutrition');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#dddddd] flex items-center space-x-2 cursor-pointer"
                >
                  <Apple className="w-5 h-5 text-[#606060]" />
                  <span>Питание</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
      label: '',
      onClick: () => {}
    },
    {
      icon: <Camera className="w-7.5 h-7.5" />,
      label: '',
      onClick: () => navigate('/client/progress')
    },
    {
      icon: <Apple className="w-7.5 h-7.5" />,
      label: '',
      onClick: () => navigate('/client/nutrition')
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % achievements.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + achievements.length) % achievements.length);
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

  return (
    <SidebarLayout
      menuItems={menuItems}
      variant="bottom"
    >
      {/* Full-screen Achievements Slider */}
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        <div className="relative h-[calc(85vh-16rem)]">
          <div 
            className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
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
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Моя следующая тренировка</h2>
          <Calendar className="w-5 h-5 text-[#606060]" />
        </div>

        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff8502]"></div>
          </div>
        ) : (
          <button
            onClick={() => navigate('/client/workouts')}
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
    </SidebarLayout>
  );
}