import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  RefreshControl,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { StackNavigationProp } from '@react-navigation/stack';

import { supabase } from '../../lib/supabase';
import { Client, Workout, ProgressRecord } from '../../types/models';
import { TrainerStackParamList } from '../../types/navigation.types';

type ClientDetailsRouteProp = RouteProp<TrainerStackParamList, 'ClientDetails'>;
type ClientDetailsScreenNavigationProp = StackNavigationProp<TrainerStackParamList, 'ClientDetails'>;

const { width } = Dimensions.get('window');
const chartWidth = width - 48;

const ClientDetailsScreen = () => {
  const navigation = useNavigation<ClientDetailsScreenNavigationProp>();
  const route = useRoute<ClientDetailsRouteProp>();
  const { clientId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [clientWorkouts, setClientWorkouts] = useState<Workout[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'progress'>('overview');

  // Функция для получения данных клиента и связанной информации
  const fetchClientData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Получаем данные клиента
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) {
        throw new Error('Ошибка при получении данных клиента');
      }

      setClient(clientData);

      // Получаем историю тренировок клиента
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(5);

      if (workoutsError) {
        console.error('Ошибка при получении истории тренировок:', workoutsError);
      } else {
        setClientWorkouts(workoutsData || []);
      }

      // Получаем записи о прогрессе клиента
      const { data: progressData, error: progressError } = await supabase
        .from('progress_records')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(10);

      if (progressError) {
        console.error('Ошибка при получении данных о прогрессе:', progressError);
      } else {
        setProgressRecords(progressData || []);
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке данных клиента:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка загрузки',
        text2: error.message || 'Не удалось загрузить данные клиента',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  // Загружаем данные при монтировании компонента и при фокусе экрана
  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  useFocusEffect(
    useCallback(() => {
      fetchClientData();
    }, [fetchClientData])
  );

  // Обработчик для обновления при свайпе вниз
  const onRefresh = () => {
    setRefreshing(true);
    fetchClientData();
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
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Обработчик создания новой тренировки
  const handleCreateWorkout = () => {
    navigation.navigate('CreateWorkout', { clientId });
  };

  // Рендер элемента тренировки
  const renderWorkoutItem = ({ item }: { item: Workout }) => {
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
          
          {item.description && (
            <Text style={styles.workoutDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Рендер элемента записи о прогрессе
  const renderProgressItem = ({ item }: { item: ProgressRecord }) => {
    return (
      <View style={styles.progressItem}>
        <Text style={styles.progressDate}>{formatDate(item.date)}</Text>
        <View style={styles.progressMetrics}>
          {item.weight !== undefined && (
            <View style={styles.progressMetric}>
              <Text style={styles.progressMetricLabel}>Вес:</Text>
              <Text style={styles.progressMetricValue}>{item.weight} кг</Text>
            </View>
          )}
          
          {item.body_fat_percentage !== undefined && (
            <View style={styles.progressMetric}>
              <Text style={styles.progressMetricLabel}>% жира:</Text>
              <Text style={styles.progressMetricValue}>{item.body_fat_percentage}%</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Клиент не найден</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Профиль клиента</Text>
        <View style={{ width: 24 }} />
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
        {/* Секция профиля */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            {client.profile_image_url ? (
              <Image 
                source={{ uri: client.profile_image_url }} 
                style={styles.profileImage} 
              />
            ) : (
              <View style={styles.initialsContainer}>
                <Text style={styles.initialsText}>
                  {getInitials(client.first_name, client.last_name)}
                </Text>
              </View>
            )}
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{client.first_name} {client.last_name}</Text>
              <Text style={styles.profileDetail}>{client.email}</Text>
              {client.phone && <Text style={styles.profileDetail}>{client.phone}</Text>}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.createWorkoutButton}
            onPress={handleCreateWorkout}
          >
            <Feather name="plus-circle" size={18} color="#ffffff" />
            <Text style={styles.createWorkoutButtonText}>Создать тренировку</Text>
          </TouchableOpacity>
        </View>

        {/* Табы */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]} 
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Обзор
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'workouts' && styles.activeTab]} 
            onPress={() => setActiveTab('workouts')}
          >
            <Text style={[styles.tabText, activeTab === 'workouts' && styles.activeTabText]}>
              Тренировки
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'progress' && styles.activeTab]} 
            onPress={() => setActiveTab('progress')}
          >
            <Text style={[styles.tabText, activeTab === 'progress' && styles.activeTabText]}>
              Прогресс
            </Text>
          </TouchableOpacity>
        </View>

        {/* Содержимое вкладки "Обзор" */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Сводка</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{clientWorkouts.length}</Text>
                  <Text style={styles.statLabel}>Всего тренировок</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {clientWorkouts.filter(w => w.status === 'completed').length}
                  </Text>
                  <Text style={styles.statLabel}>Завершенных</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {progressRecords.length > 0 ? progressRecords[0].weight || 0 : 0}
                  </Text>
                  <Text style={styles.statLabel}>Вес (кг)</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Последние тренировки</Text>
                <TouchableOpacity onPress={() => setActiveTab('workouts')}>
                  <Text style={styles.seeAllText}>Все тренировки</Text>
                </TouchableOpacity>
              </View>
              
              {clientWorkouts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    У клиента пока нет тренировок
                  </Text>
                </View>
              ) : (
                clientWorkouts.slice(0, 3).map(workout => (
                  <TouchableOpacity 
                    key={workout.id}
                    style={styles.workoutItem}
                    onPress={() => navigation.navigate('WorkoutDetails', { workoutId: workout.id })}
                  >
                    <View style={styles.workoutItemMain}>
                      <Text style={styles.workoutItemName}>{workout.name}</Text>
                      <Text style={styles.workoutItemDate}>{formatDate(workout.date)}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#6b7280" />
                  </TouchableOpacity>
                ))
              )}
            </View>
            
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Прогресс</Text>
                <TouchableOpacity onPress={() => setActiveTab('progress')}>
                  <Text style={styles.seeAllText}>Подробнее</Text>
                </TouchableOpacity>
              </View>
              
              {progressRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Нет данных о прогрессе
                  </Text>
                </View>
              ) : (
                <View style={styles.progressSummary}>
                  <View style={styles.progressSummaryItem}>
                    <Text style={styles.progressSummaryLabel}>Текущий вес</Text>
                    <Text style={styles.progressSummaryValue}>
                      {progressRecords[0].weight || 'Нет данных'} 
                      {progressRecords[0].weight ? ' кг' : ''}
                    </Text>
                  </View>
                  
                  <View style={styles.progressSummaryItem}>
                    <Text style={styles.progressSummaryLabel}>Процент жира</Text>
                    <Text style={styles.progressSummaryValue}>
                      {progressRecords[0].body_fat_percentage || 'Нет данных'}
                      {progressRecords[0].body_fat_percentage ? '%' : ''}
                    </Text>
                  </View>
                  
                  <View style={styles.progressSummaryItem}>
                    <Text style={styles.progressSummaryLabel}>Последнее измерение</Text>
                    <Text style={styles.progressSummaryValue}>
                      {formatDate(progressRecords[0].date)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Содержимое вкладки "Тренировки" */}
        {activeTab === 'workouts' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>История тренировок</Text>
              <TouchableOpacity onPress={handleCreateWorkout}>
                <Text style={styles.addWorkoutText}>+ Добавить</Text>
              </TouchableOpacity>
            </View>
            
            {clientWorkouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="calendar" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>Нет тренировок</Text>
                <Text style={styles.emptyStateText}>
                  У клиента пока нет тренировок. Создайте первую тренировку.
                </Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={handleCreateWorkout}
                >
                  <Text style={styles.emptyStateButtonText}>Создать тренировку</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={clientWorkouts}
                renderItem={renderWorkoutItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        )}

        {/* Содержимое вкладки "Прогресс" */}
        {activeTab === 'progress' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>История измерений</Text>
            </View>
            
            {progressRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="bar-chart-2" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>Нет данных о прогрессе</Text>
                <Text style={styles.emptyStateText}>
                  У клиента пока нет записей о прогрессе.
                </Text>
              </View>
            ) : (
              <>
                {/* Простой график веса - прямоугольники разной высоты */}
                <View style={styles.chartContainer}>
                  <Text style={styles.chartTitle}>Динамика веса (кг)</Text>
                  <View style={styles.chart}>
                    {progressRecords.slice(0, 7).reverse().map((record, index) => {
                      // Находим минимальный и максимальный вес
                      const weights = progressRecords.slice(0, 7).map(r => r.weight || 0);
                      const maxWeight = Math.max(...weights);
                      const minWeight = Math.min(...weights) * 0.9; // Немного меньше минимального для лучшей визуализации
                      
                      // Вычисляем высоту столбца (от 10% до 100% высоты графика)
                      const barHeight = record.weight
                        ? ((record.weight - minWeight) / (maxWeight - minWeight)) * 100
                        : 0;
                      
                      return (
                        <View key={index} style={styles.chartBarContainer}>
                          <View 
                            style={[
                              styles.chartBar, 
                              { height: `${Math.max(10, barHeight)}%` }
                            ]}
                          />
                          <Text style={styles.chartBarValue}>{record.weight}</Text>
                          <Text style={styles.chartBarLabel}>
                            {formatDate(record.date).split('.')[0]}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                
                <View style={styles.progressHistory}>
                  <Text style={styles.subSectionTitle}>История измерений</Text>
                  <FlatList
                    data={progressRecords}
                    renderItem={renderProgressItem}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  />
                </View>
              </>
            )}
          </View>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4361ee',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  initialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4361ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  initialsText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  createWorkoutButton: {
    backgroundColor: '#4361ee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  createWorkoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4361ee',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#4361ee',
  },
  tabContent: {
    padding: 16,
  },
  summarySection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4361ee',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  recentSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4361ee',
  },
  addWorkoutText: {
    fontSize: 14,
    color: '#4361ee',
    fontWeight: '600',
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  workoutItemMain: {
    flex: 1,
  },
  workoutItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  workoutItemDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressSummary: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  progressSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressSummaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#4361ee',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontWeight: '500',
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
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  chart: {
    height: 200,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 20,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 24,
    backgroundColor: '#4361ee',
    borderRadius: 4,
  },
  chartBarValue: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  progressHistory: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  progressItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  progressMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  progressMetric: {
    flexDirection: 'row',
    marginRight: 16,
    marginBottom: 4,
  },
  progressMetricLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 4,
  },
  progressMetricValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
});

export default ClientDetailsScreen; 