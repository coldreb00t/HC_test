import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { StackNavigationProp } from '@react-navigation/stack';

import { supabase } from '../../lib/supabase';
import { Workout, Client } from '../../types/models';
import { TrainerStackParamList } from '../../types/navigation.types';
import { ROUTES } from '../../constants/routes';

type TrainerDashboardScreenNavigationProp = StackNavigationProp<TrainerStackParamList, 'TrainerTabs'>;

const { width } = Dimensions.get('window');
const cardWidth = width * 0.85;

const TrainerDashboardScreen = () => {
  const navigation = useNavigation<TrainerDashboardScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeWorkouts: 0,
    completedWorkouts: 0,
  });
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<Workout[]>([]);

  // Функция для получения данных дашборда
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Не удалось получить данные пользователя');
      }

      // Получаем данные тренера
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (trainerError || !trainerData) {
        throw new Error('Не удалось получить данные тренера');
      }

      const trainerId = trainerData.id;

      // Получаем количество клиентов
      const { count: clientsCount, error: clientsCountError } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', trainerId);

      if (clientsCountError) {
        console.error('Ошибка при получении количества клиентов:', clientsCountError);
      }

      // Получаем количество активных тренировок
      const { count: activeWorkoutsCount, error: activeWorkoutsError } = await supabase
        .from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .eq('status', 'in_progress');

      if (activeWorkoutsError) {
        console.error('Ошибка при получении количества активных тренировок:', activeWorkoutsError);
      }

      // Получаем количество завершенных тренировок
      const { count: completedWorkoutsCount, error: completedWorkoutsError } = await supabase
        .from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .eq('status', 'completed');

      if (completedWorkoutsError) {
        console.error('Ошибка при получении количества завершенных тренировок:', completedWorkoutsError);
      }

      // Получаем список последних клиентов
      const { data: recentClientsData, error: recentClientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentClientsError) {
        console.error('Ошибка при получении списка последних клиентов:', recentClientsError);
      }

      // Получаем список ближайших тренировок
      const today = new Date().toISOString().split('T')[0];
      const { data: upcomingWorkoutsData, error: upcomingWorkoutsError } = await supabase
        .from('workouts')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        `)
        .eq('trainer_id', trainerId)
        .gte('date', today)
        .not('status', 'eq', 'cancelled')
        .order('date')
        .limit(5);

      if (upcomingWorkoutsError) {
        console.error('Ошибка при получении списка ближайших тренировок:', upcomingWorkoutsError);
      }

      // Обновляем состояние
      setStats({
        totalClients: clientsCount || 0,
        activeWorkouts: activeWorkoutsCount || 0,
        completedWorkouts: completedWorkoutsCount || 0,
      });
      setRecentClients(recentClientsData || []);
      setUpcomingWorkouts(upcomingWorkoutsData || []);
    } catch (error: any) {
      console.error('Ошибка при загрузке данных дашборда:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка загрузки',
        text2: error.message || 'Не удалось загрузить данные дашборда',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Загружаем данные при монтировании компонента и при фокусе экрана
  useEffect(() => {
    fetchDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  // Обработчик для обновления при свайпе вниз
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Рендер элемента клиента
  const renderClientItem = ({ item }: { item: Client }) => {
    return (
      <TouchableOpacity 
        style={styles.clientCard}
        onPress={() => navigation.navigate('ClientDetails', { clientId: item.id })}
      >
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.first_name} {item.last_name}</Text>
          <Text style={styles.clientEmail}>{item.email}</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#6b7280" />
      </TouchableOpacity>
    );
  };

  // Рендер элемента тренировки
  const renderWorkoutItem = ({ item }: { item: Workout }) => {
    const client = item.clients as unknown as Client;
    
    return (
      <TouchableOpacity 
        style={styles.workoutCard}
        onPress={() => navigation.navigate('WorkoutDetails', { workoutId: item.id })}
      >
        <View style={styles.workoutHeader}>
          <Text style={styles.workoutName}>{item.name}</Text>
          <View style={[
            styles.workoutStatus, 
            item.status === 'completed' ? styles.statusCompleted : 
            item.status === 'in_progress' ? styles.statusInProgress : 
            styles.statusScheduled
          ]}>
            <Text style={styles.workoutStatusText}>
              {item.status === 'completed' ? 'Завершена' : 
               item.status === 'in_progress' ? 'В процессе' : 
               'Запланирована'}
            </Text>
          </View>
        </View>

        <View style={styles.workoutDetails}>
          <View style={styles.workoutDetail}>
            <Feather name="calendar" size={16} color="#4361ee" />
            <Text style={styles.workoutDetailText}>{formatDate(item.date)}</Text>
          </View>
          
          <View style={styles.workoutDetail}>
            <Feather name="user" size={16} color="#4361ee" />
            <Text style={styles.workoutDetailText}>
              {client ? `${client.first_name} ${client.last_name}` : 'Нет данных'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Дашборд тренера</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4361ee"]}
            tintColor="#4361ee"
          />
        }
      >
        {/* Статистика */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalClients}</Text>
            <Text style={styles.statLabel}>Всего клиентов</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeWorkouts}</Text>
            <Text style={styles.statLabel}>Активных тренировок</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedWorkouts}</Text>
            <Text style={styles.statLabel}>Завершенных тренировок</Text>
          </View>
        </View>

        {/* Быстрые действия */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateWorkout', {})}
          >
            <View style={styles.actionIcon}>
              <Feather name="plus-circle" size={20} color="#ffffff" />
            </View>
            <Text style={styles.actionText}>Создать тренировку</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate(ROUTES.TRAINER.TABS.CLIENTS)}
          >
            <View style={styles.actionIcon}>
              <Feather name="users" size={20} color="#ffffff" />
            </View>
            <Text style={styles.actionText}>Мои клиенты</Text>
          </TouchableOpacity>
        </View>

        {/* Последние клиенты */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Последние клиенты</Text>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.TRAINER.TABS.CLIENTS)}>
              <Text style={styles.seeAllText}>Смотреть все</Text>
            </TouchableOpacity>
          </View>
          
          {recentClients.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="users" size={24} color="#d1d5db" />
              <Text style={styles.emptyStateText}>У вас пока нет клиентов</Text>
            </View>
          ) : (
            <FlatList
              data={recentClients}
              renderItem={renderClientItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.clientsList}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Ближайшие тренировки */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ближайшие тренировки</Text>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.TRAINER.TABS.WORKOUTS)}>
              <Text style={styles.seeAllText}>Смотреть все</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={24} color="#d1d5db" />
              <Text style={styles.emptyStateText}>Нет запланированных тренировок</Text>
            </View>
          ) : (
            <FlatList
              data={upcomingWorkouts}
              renderItem={renderWorkoutItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.workoutsList}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4361ee',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
    marginHorizontal: 4,
  },
  actionIcon: {
    backgroundColor: '#4361ee',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4361ee',
  },
  clientsList: {
    marginTop: 8,
  },
  clientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  workoutsList: {
    marginTop: 8,
  },
  workoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  workoutStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusScheduled: {
    backgroundColor: '#dbeafe',
  },
  statusInProgress: {
    backgroundColor: '#fef3c7',
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  workoutStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  workoutDetails: {
    marginTop: 4,
  },
  workoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  workoutDetailText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
});

export default TrainerDashboardScreen; 