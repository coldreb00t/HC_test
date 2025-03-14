import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons/Feather';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { ROUTES } from '../constants/routes';

// Интерфейс для типа данных Тренировки
interface Workout {
  id: string;
  name: string;
  description: string | null;
  date: string;
  status: string;
}

// Расширенный интерфейс достижения
interface Achievement {
  title: string;
  description: string;
  icon: string; // Имя иконки для React Native
  value: string;
  color: string;
  bgImage?: string; // URL изображения для фона
  achievementImage?: string; // URL изображения достижения
  motivationalPhrase: string; // Мотивационная фраза
  beastComponent?: boolean; // Флаг для специального компонента "Зверь"
}

// Интерфейс для статистики пользователя
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

const ClientDashboardScreen = () => {
  const navigation = useNavigation();
  const [nextWorkout, setNextWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
  
  // Массив достижений
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Получение данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Получаем текущего пользователя
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Пользователь не авторизован');
        }
        
        // Получаем данные клиента
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (clientError) {
          throw clientError;
        }
        
        setClientData(clientData);
        
        // Демонстрационные данные для достижений
        const demoAchievements = [
          {
            title: 'Завершенные тренировки',
            description: 'Регулярность - ключ к результатам',
            value: '0',
            icon: 'calendar',
            color: 'bg-blue-500',
            bgImage: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712',
            motivationalPhrase: 'Каждая завершенная тренировка - шаг к лучшей версии себя!'
          },
          {
            title: 'Общий объем тренировок',
            description: 'Ваш путь к силе',
            value: '0 кг',
            icon: 'activity',
            color: 'bg-orange-500',
            bgImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
            motivationalPhrase: 'Тонны поднятого веса формируют характер сильного человека.'
          },
          {
            title: 'Активность',
            description: 'Движение - это жизнь',
            value: '0 мин',
            icon: 'zap',
            color: 'bg-green-500',
            bgImage: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c',
            motivationalPhrase: 'Каждая минута активности дарит часы здоровой жизни.'
          }
        ];
        
        setAchievements(demoAchievements);
        
        // Получаем следующую тренировку клиента
        if (clientData.id) {
          await fetchNextWorkout(clientData.id);
          await fetchStats(clientData.id);
        }
      } catch (error: any) {
        console.error('Ошибка при загрузке данных:', error.message);
        Toast.show({
          type: 'error',
          text1: 'Ошибка',
          text2: 'Не удалось загрузить данные'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Получение следующей тренировки клиента
  const fetchNextWorkout = async (clientId: string) => {
    try {
      // Текущая дата в формате ISO для сравнения
      const currentDate = new Date().toISOString();
      
      // Получаем ближайшую тренировку с датой >= текущей даты
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId)
        .gte('date', currentDate.split('T')[0])
        .order('date', { ascending: true })
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        setNextWorkout(data[0]);
      }
    } catch (error: any) {
      console.error('Ошибка при получении следующей тренировки:', error.message);
    }
  };
  
  // Получение статистики клиента
  const fetchStats = async (clientId: string) => {
    try {
      // В реальном приложении здесь был бы запрос к API для получения статистики
      // Здесь используем демо-данные
      const demoStats: UserStats = {
        workouts: {
          totalCount: 12,
          completedCount: 8,
          totalVolume: 1850
        },
        activities: {
          totalMinutes: 320,
          types: {
            'running': 120,
            'cycling': 80,
            'swimming': 60,
            'walking': 60
          }
        },
        measurements: {
          currentWeight: 82.5,
          initialWeight: 88,
          weightChange: -5.5
        },
        achievements: {
          total: 15,
          completed: 6
        }
      };
      
      setUserStats(demoStats);
      
      // Обновляем достижения с реальными данными
      updateAchievements(demoStats);
    } catch (error: any) {
      console.error('Ошибка при получении статистики:', error.message);
    }
  };
  
  // Обновление достижений с реальными данными
  const updateAchievements = (stats: UserStats) => {
    const updatedAchievements = [
      {
        title: 'Завершенные тренировки',
        description: 'Регулярность - ключ к результатам',
        value: `${stats.workouts.completedCount}`,
        icon: 'calendar',
        color: 'bg-blue-500',
        bgImage: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712',
        motivationalPhrase: 'Каждая завершенная тренировка - шаг к лучшей версии себя!'
      },
      {
        title: 'Общий объем тренировок',
        description: 'Ваш путь к силе',
        value: `${stats.workouts.totalVolume} кг`,
        icon: 'activity',
        color: 'bg-orange-500',
        bgImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
        motivationalPhrase: 'Тонны поднятого веса формируют характер сильного человека.'
      },
      {
        title: 'Активность',
        description: 'Движение - это жизнь',
        value: `${stats.activities.totalMinutes} мин`,
        icon: 'zap',
        color: 'bg-green-500',
        bgImage: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c',
        motivationalPhrase: 'Каждая минута активности дарит часы здоровой жизни.'
      }
    ];
    
    setAchievements(updatedAchievements);
  };
  
  // Обработка выхода из системы
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      Toast.show({
        type: 'success',
        text1: 'Выход выполнен успешно'
      });
    } catch (error: any) {
      console.error('Ошибка при выходе:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось выйти из системы'
      });
    }
  };
  
  // Функция перехода к деталям тренировки
  const goToWorkoutDetails = (workoutId: string) => {
    navigation.navigate(ROUTES.CLIENT.WORKOUT_DETAILS as never, { workoutId } as never);
  };
  
  // Рендеринг достижения
  const renderAchievement = ({ item }: { item: Achievement }) => {
    // Получаем соответствующую иконку
    const IconComponent = Icons[item.icon as keyof typeof Icons] || Icons.Award;
    
    return (
      <View style={styles.achievementCard}>
        <View style={styles.achievementIconContainer}>
          <IconComponent color="#ffffff" size={40} />
        </View>
        <Text style={styles.achievementValue}>{item.value}</Text>
        <Text style={styles.achievementTitle}>{item.title}</Text>
        <Text style={styles.achievementDescription}>{item.description}</Text>
        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>"{item.motivationalPhrase}"</Text>
        </View>
      </View>
    );
  };
  
  // Рендер нижней навигации
  const renderBottomMenu = () => {
    return (
      <View style={styles.bottomMenu}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate(ROUTES.CLIENT.DASHBOARD as never)}
        >
          <Icons.Home color="#f97316" size={24} />
          <Text style={styles.menuItemText}>Главная</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate(ROUTES.CLIENT.WORKOUTS as never)}
        >
          <Icons.Dumbbell color="#6b7280" size={24} />
          <Text style={[styles.menuItemText, {color: '#6b7280'}]}>Тренировки</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate(ROUTES.CLIENT.NUTRITION as never)}
        >
          <Icons.Coffee color="#6b7280" size={24} />
          <Text style={[styles.menuItemText, {color: '#6b7280'}]}>Питание</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate(ROUTES.CLIENT.PROGRESS_PHOTOS as never)}
        >
          <Icons.BarChart2 color="#6b7280" size={24} />
          <Text style={[styles.menuItemText, {color: '#6b7280'}]}>Прогресс</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Верхний заголовок */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HARDCASE</Text>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => setShowProfileMenu(!showProfileMenu)}
        >
          <Icons.User size={20} color="#4b5563" />
        </TouchableOpacity>
        
        {/* Выпадающее меню профиля */}
        {showProfileMenu && (
          <View style={styles.profileMenu}>
            <TouchableOpacity 
              style={styles.profileMenuItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigation.navigate(ROUTES.CLIENT.ACHIEVEMENTS as never);
              }}
            >
              <Icons.Award size={16} color="#4b5563" />
              <Text style={styles.profileMenuItemText}>Достижения и прогресс</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileMenuItem}
              onPress={() => {
                setShowProfileMenu(false);
                handleLogout();
              }}
            >
              <Icons.LogOut size={16} color="#4b5563" />
              <Text style={styles.profileMenuItemText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <ScrollView style={styles.content}>
        {/* Раздел достижений */}
        <View style={styles.achievementsSection}>
          <FlatList
            data={achievements}
            renderItem={renderAchievement}
            keyExtractor={(item) => item.title}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const slideWidth = Dimensions.get('window').width;
              const currentIndex = Math.floor(
                event.nativeEvent.contentOffset.x / slideWidth
              );
              setCurrentSlide(currentIndex);
            }}
          />
          
          {/* Индикаторы слайдов */}
          <View style={styles.paginationContainer}>
            {achievements.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentSlide && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        </View>
        
        {/* Следующая тренировка */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Следующая тренировка</Text>
          {nextWorkout ? (
            <TouchableOpacity 
              style={styles.nextWorkoutCard}
              onPress={() => goToWorkoutDetails(nextWorkout.id)}
            >
              <View style={styles.nextWorkoutHeader}>
                <Text style={styles.nextWorkoutName}>{nextWorkout.name}</Text>
                <Icons.ChevronRight size={20} color="#6b7280" />
              </View>
              <Text style={styles.nextWorkoutDate}>
                {new Date(nextWorkout.date).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </Text>
              {nextWorkout.description && (
                <Text style={styles.nextWorkoutDescription}>
                  {nextWorkout.description}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyNextWorkout}>
              <Text style={styles.emptyNextWorkoutText}>
                Нет запланированных тренировок
              </Text>
              <TouchableOpacity 
                style={styles.goToWorkoutsButton}
                onPress={() => navigation.navigate(ROUTES.CLIENT.WORKOUTS as never)}
              >
                <Text style={styles.goToWorkoutsButtonText}>
                  Посмотреть все тренировки
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Быстрые действия */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Быстрые действия</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate(ROUTES.CLIENT.MEASUREMENTS_UPLOAD as never)}
            >
              <Icons.Scale size={24} color="#f97316" />
              <Text style={styles.quickActionText}>Измерения</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate(ROUTES.CLIENT.PHOTO_UPLOAD as never)}
            >
              <Icons.Camera size={24} color="#f97316" />
              <Text style={styles.quickActionText}>Фото прогресса</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate(ROUTES.CLIENT.NUTRITION as never)}
            >
              <Icons.Coffee size={24} color="#f97316" />
              <Text style={styles.quickActionText}>Питание</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate(ROUTES.CLIENT.ACTIVITY as never)}
            >
              <Icons.Activity size={24} color="#f97316" />
              <Text style={styles.quickActionText}>Активность</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Нижняя навигация */}
      {renderBottomMenu()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 20,
    width: 200,
  },
  profileMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileMenuItemText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#4b5563',
  },
  content: {
    flex: 1,
  },
  achievementsSection: {
    marginBottom: 20,
    height: 350,
  },
  achievementCard: {
    width: Dimensions.get('window').width,
    height: 300,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f97316',
  },
  achievementIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 16,
  },
  motivationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
  },
  motivationText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#f97316',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sectionContainer: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  nextWorkoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  nextWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextWorkoutName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  nextWorkoutDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  nextWorkoutDescription: {
    fontSize: 14,
    color: '#4b5563',
  },
  emptyNextWorkout: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyNextWorkoutText: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 12,
  },
  goToWorkoutsButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  goToWorkoutsButtonText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  menuItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 12,
    marginTop: 4,
    color: '#f97316',
    fontWeight: '500',
  },
});

export default ClientDashboardScreen; 