import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons/Feather';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { ROUTES } from '../constants/routes';

interface Workout {
  id: string;
  name: string;
  description: string | null;
  date: string;
  status: string;
  client_id: string;
  trainer_id: string;
}

const ClientWorkoutsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'past'>('all');
  
  useEffect(() => {
    fetchWorkouts();
  }, []);
  
  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      // Получаем данные клиента по идентификатору пользователя
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (clientError) {
        throw clientError;
      }
      
      // Получаем все тренировки клиента
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientData.id)
        .order('date', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      setWorkouts(data || []);
    } catch (error: any) {
      console.error('Ошибка при загрузке тренировок:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить тренировки'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const filteredWorkouts = () => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Сбрасываем время до начала дня
    
    switch (filter) {
      case 'upcoming':
        return workouts.filter(workout => {
          const workoutDate = new Date(workout.date);
          workoutDate.setHours(0, 0, 0, 0);
          return workoutDate >= currentDate;
        });
      case 'completed':
        return workouts.filter(workout => workout.status === 'completed');
      case 'past':
        return workouts.filter(workout => {
          const workoutDate = new Date(workout.date);
          workoutDate.setHours(0, 0, 0, 0);
          return workoutDate < currentDate;
        });
      default:
        return workouts;
    }
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
        return 'Ожидает';
    }
  };
  
  const renderWorkoutItem = ({ item }: { item: Workout }) => {
    const workoutDate = new Date(item.date);
    const formattedDate = workoutDate.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    
    // Определяем, является ли тренировка прошедшей
    const isPast = workoutDate < new Date();
    
    return (
      <TouchableOpacity
        style={styles.workoutCard}
        onPress={() => navigation.navigate(ROUTES.CLIENT.WORKOUT_DETAILS as never, { workoutId: item.id } as never)}
      >
        <View style={styles.workoutHeader}>
          <Text style={styles.workoutName}>{item.name}</Text>
          <Icons.ChevronRight size={20} color="#6b7280" />
        </View>
        
        <Text style={styles.workoutDate}>{formattedDate}</Text>
        
        {item.description && (
          <Text style={styles.workoutDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.workoutFooter}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          
          {isPast && item.status !== 'completed' && (
            <View style={styles.missedBadge}>
              <Text style={styles.missedText}>Пропущена</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icons.Calendar size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>Нет тренировок</Text>
      <Text style={styles.emptyText}>
        {filter === 'all' 
          ? 'У вас пока нет запланированных тренировок' 
          : filter === 'upcoming'
            ? 'У вас нет предстоящих тренировок'
            : filter === 'completed'
              ? 'У вас нет завершенных тренировок'
              : 'У вас нет прошедших тренировок'}
      </Text>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icons.ArrowLeft size={20} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Мои тренировки</Text>
        <View style={styles.placeholderRight} />
      </View>
      
      {/* Фильтры */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Все
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
            onPress={() => setFilter('upcoming')}
          >
            <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
              Предстоящие
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
            onPress={() => setFilter('completed')}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              Завершенные
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filter === 'past' && styles.filterButtonActive]}
            onPress={() => setFilter('past')}
          >
            <Text style={[styles.filterText, filter === 'past' && styles.filterTextActive]}>
              Прошедшие
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          style={styles.workoutsList}
          contentContainerStyle={styles.workoutsListContent}
          data={filteredWorkouts()}
          keyExtractor={item => item.id}
          renderItem={renderWorkoutItem}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholderRight: {
    width: 40,
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#f97316',
  },
  filterText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutsList: {
    flex: 1,
  },
  workoutsListContent: {
    padding: 16,
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
    marginBottom: 16,
  },
  workoutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  missedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  missedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ef4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ClientWorkoutsScreen; 