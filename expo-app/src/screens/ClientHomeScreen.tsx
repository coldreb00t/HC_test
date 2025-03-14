import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons/Feather';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { ROUTES } from '../constants/routes';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
}

interface Trainer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Workout {
  id: string;
  name: string;
  description: string | null;
  date: string;
  status: string;
  client_id: string;
  trainer_id: string;
}

const ClientHomeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<Workout[]>([]);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
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
      
      setClientInfo(clientData);
      
      // Если у клиента есть тренер, получаем его данные
      if (clientData.trainer_id) {
        const { data: trainerData, error: trainerError } = await supabase
          .from('trainers')
          .select('*')
          .eq('id', clientData.trainer_id)
          .single();
        
        if (trainerError) {
          console.error('Ошибка при загрузке данных тренера:', trainerError.message);
        } else {
          setTrainer(trainerData);
        }
      }
      
      // Получаем предстоящие тренировки
      await fetchUpcomingWorkouts(clientData.id);
      
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
  
  const fetchUpcomingWorkouts = async (clientId: string) => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId)
        .gte('date', currentDate)
        .order('date', { ascending: true })
        .limit(3);
      
      if (error) {
        throw error;
      }
      
      setUpcomingWorkouts(data || []);
      
    } catch (error: any) {
      console.error('Ошибка при загрузке тренировок:', error.message);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22c55e'; // зеленый
      case 'in_progress':
        return '#f97316'; // оранжевый
      default:
        return '#6b7280'; // серый
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Завершена';
      case 'in_progress':
        return 'Выполняется';
      default:
        return 'Запланирована';
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f97316']}
            tintColor="#f97316"
          />
        }
      >
        {/* Приветствие */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcome}>Привет, {clientInfo?.first_name}!</Text>
          <Text style={styles.welcomeSubtitle}>Добро пожаловать в приложение</Text>
        </View>
        
        {/* Информация о тренере */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ваш тренер</Text>
          </View>
          
          {trainer ? (
            <View style={styles.trainerCard}>
              <View style={styles.trainerAvatar}>
                <Text style={styles.trainerInitials}>
                  {trainer.first_name[0]}{trainer.last_name[0]}
                </Text>
              </View>
              <View style={styles.trainerInfo}>
                <Text style={styles.trainerName}>
                  {trainer.first_name} {trainer.last_name}
                </Text>
                <Text style={styles.trainerContact}>{trainer.email}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                У вас еще нет назначенного тренера
              </Text>
            </View>
          )}
        </View>
        
        {/* Ближайшие тренировки */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ближайшие тренировки</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.CLIENT.WORKOUTS as never)}
            >
              <Text style={styles.seeAllText}>Смотреть все</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingWorkouts.length > 0 ? (
            upcomingWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={styles.workoutCard}
                onPress={() => 
                  navigation.navigate(
                    ROUTES.CLIENT.WORKOUT_DETAILS as never, 
                    { workoutId: workout.id } as never
                  )
                }
              >
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <Icons.ChevronRight size={20} color="#6b7280" />
                </View>
                
                <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
                
                {workout.description && (
                  <Text style={styles.workoutDescription} numberOfLines={2}>
                    {workout.description}
                  </Text>
                )}
                
                <View style={styles.workoutFooter}>
                  <View 
                    style={[
                      styles.statusBadge, 
                      { backgroundColor: `${getStatusColor(workout.status)}20` }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.statusText, 
                        { color: getStatusColor(workout.status) }
                      ]}
                    >
                      {getStatusText(workout.status)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                У вас нет запланированных тренировок
              </Text>
            </View>
          )}
        </View>
        
        {/* Быстрые действия */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Быстрые действия</Text>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate(ROUTES.CLIENT.WORKOUTS as never)}
            >
              <View style={styles.actionIcon}>
                <Icons.Calendar size={24} color="#f97316" />
              </View>
              <Text style={styles.actionText}>Мои тренировки</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate(ROUTES.CLIENT.PROFILE as never)}
            >
              <View style={styles.actionIcon}>
                <Icons.User size={24} color="#f97316" />
              </View>
              <Text style={styles.actionText}>Мой профиль</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  welcomeContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 30,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  sectionContainer: {
    margin: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  trainerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trainerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  trainerInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  trainerContact: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
  },
  workoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  workoutDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  workoutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  actionIcon: {
    backgroundColor: '#fff7ed',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
  },
});

export default ClientHomeScreen; 