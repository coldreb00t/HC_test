import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { StackNavigationProp } from '@react-navigation/stack';

import { supabase } from '../../lib/supabase';
import { Workout, Client } from '../../types/models';
import { TrainerStackParamList } from '../../types/navigation.types';

type TrainerWorkoutsScreenNavigationProp = StackNavigationProp<TrainerStackParamList, 'TrainerTabs'>;

interface WorkoutWithClient extends Workout {
  client?: Client;
}

const TrainerWorkoutsScreen = () => {
  const navigation = useNavigation<TrainerWorkoutsScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutWithClient[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<WorkoutWithClient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');

  // Функция для получения всех тренировок тренера
  const fetchWorkouts = useCallback(async () => {
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

      // Получаем список тренировок вместе с данными клиентов
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          *,
          clients:client_id (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        `)
        .eq('trainer_id', trainerData.id)
        .order('date', { ascending: false });

      if (workoutsError) {
        throw new Error('Ошибка при получении списка тренировок');
      }

      // Преобразуем данные для правильного отображения
      const formattedWorkouts: WorkoutWithClient[] = workoutsData.map((workout: any) => {
        return {
          ...workout,
          client: workout.clients
        };
      });

      setWorkouts(formattedWorkouts);
      applyFilters(formattedWorkouts, searchQuery, filter);
    } catch (error: any) {
      console.error('Ошибка при загрузке тренировок:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка загрузки',
        text2: error.message || 'Не удалось загрузить список тренировок',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, searchQuery]);

  // Применяем фильтры к списку тренировок
  const applyFilters = (workouts: WorkoutWithClient[], query: string, statusFilter: string) => {
    let filtered = [...workouts];
    
    // Фильтрация по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(workout => workout.status === statusFilter);
    }
    
    // Фильтрация по поисковому запросу
    if (query.trim() !== '') {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter(workout => 
        workout.name.toLowerCase().includes(lowercaseQuery) ||
        (workout.client && 
         (`${workout.client.first_name} ${workout.client.last_name}`).toLowerCase().includes(lowercaseQuery))
      );
    }
    
    setFilteredWorkouts(filtered);
  };

  // Обработчик изменения поискового запроса
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(workouts, text, filter);
  };

  // Обработчик изменения фильтра по статусу
  const handleFilterChange = (newFilter: 'all' | 'scheduled' | 'in_progress' | 'completed') => {
    setFilter(newFilter);
    applyFilters(workouts, searchQuery, newFilter);
  };

  // Загружаем данные при монтировании компонента и при фокусе экрана
  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [fetchWorkouts])
  );

  // Обработчик для обновления при свайпе вниз
  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkouts();
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Функция для отображения инициалов клиента
  const getClientInitials = (workout: WorkoutWithClient) => {
    if (!workout.client) return 'НД';
    return `${workout.client.first_name.charAt(0)}${workout.client.last_name.charAt(0)}`.toUpperCase();
  };

  // Функция для получения имени клиента
  const getClientName = (workout: WorkoutWithClient) => {
    if (!workout.client) return 'Нет данных о клиенте';
    return `${workout.client.first_name} ${workout.client.last_name}`;
  };

  // Функция для создания новой тренировки
  const handleCreateWorkout = () => {
    navigation.navigate('CreateWorkout', {});
  };

  // Рендер элемента тренировки
  const renderWorkoutItem = ({ item }: { item: WorkoutWithClient }) => {
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
            <Text style={styles.workoutDetailText}>{getClientName(item)}</Text>
          </View>
          
          {item.description && (
            <Text style={styles.workoutDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
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
        <Text style={styles.headerTitle}>Тренировки</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleCreateWorkout}
        >
          <Feather name="plus" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по названию или клиенту"
            value={searchQuery}
            onChangeText={handleSearch}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
            onPress={() => handleFilterChange('all')}
          >
            <Text style={[styles.filterButtonText, filter === 'all' && styles.activeFilterText]}>
              Все
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'scheduled' && styles.activeFilterButton]}
            onPress={() => handleFilterChange('scheduled')}
          >
            <Text style={[styles.filterButtonText, filter === 'scheduled' && styles.activeFilterText]}>
              Запланированные
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'in_progress' && styles.activeFilterButton]}
            onPress={() => handleFilterChange('in_progress')}
          >
            <Text style={[styles.filterButtonText, filter === 'in_progress' && styles.activeFilterText]}>
              В процессе
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'completed' && styles.activeFilterButton]}
            onPress={() => handleFilterChange('completed')}
          >
            <Text style={[styles.filterButtonText, filter === 'completed' && styles.activeFilterText]}>
              Завершенные
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredWorkouts.length === 0 ? (
        <View style={styles.emptyContainer}>
          {searchQuery.trim() !== '' || filter !== 'all' ? (
            <>
              <Feather name="search" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>Ничего не найдено</Text>
              <Text style={styles.emptyText}>
                Попробуйте изменить параметры поиска или фильтрации
              </Text>
            </>
          ) : (
            <>
              <Feather name="calendar" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>У вас пока нет тренировок</Text>
              <Text style={styles.emptyText}>
                Нажмите на кнопку "+" в правом верхнем углу, чтобы создать новую тренировку
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredWorkouts}
          renderItem={renderWorkoutItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.workoutsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4361ee"]}
              tintColor="#4361ee"
            />
          }
        />
      )}
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
  addButton: {
    backgroundColor: '#4361ee',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterButton: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  activeFilterText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  workoutsList: {
    padding: 16,
  },
  workoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  workoutDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TrainerWorkoutsScreen; 