import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { StackNavigationProp } from '@react-navigation/stack';

import { supabase } from '../../lib/supabase';
import { ProgressRecord } from '../../types/models';
import { ClientStackParamList } from '../../types/navigation.types';

type ClientProgressScreenNavigationProp = StackNavigationProp<ClientStackParamList, 'ClientTabs'>;

const ClientProgressScreen = () => {
  const navigation = useNavigation<ClientProgressScreenNavigationProp>();
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Функция для получения записей о прогрессе
  const fetchProgressRecords = useCallback(async () => {
    try {
      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Не удалось получить данные пользователя');
      }

      // Получаем данные клиента
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        throw new Error('Не удалось получить данные клиента');
      }

      // Получаем записи о прогрессе
      const { data, error } = await supabase
        .from('progress_records')
        .select('*')
        .eq('client_id', clientData.id)
        .order('date', { ascending: false });

      if (error) {
        throw new Error('Ошибка при получении записей о прогрессе');
      }

      setProgressRecords(data as ProgressRecord[]);
    } catch (error: any) {
      console.error('Ошибка при загрузке записей о прогрессе:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка загрузки',
        text2: error.message || 'Не удалось загрузить записи о прогрессе',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Загружаем данные при монтировании компонента и при фокусе экрана
  useEffect(() => {
    fetchProgressRecords();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProgressRecords();
    }, [fetchProgressRecords])
  );

  // Обработчик для обновления при свайпе вниз
  const onRefresh = () => {
    setRefreshing(true);
    fetchProgressRecords();
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

  // Получаем последние записи для отображения текущих показателей
  const latestRecord = progressRecords.length > 0 ? progressRecords[0] : null;
  
  // Вычисляем изменения для текущих показателей
  const calculateChange = () => {
    if (progressRecords.length < 2) return null;
    
    const latest = progressRecords[0];
    const previous = progressRecords[1];
    
    const weightChange = latest.weight - previous.weight;
    
    let bodyFatChange = null;
    if (latest.body_fat !== null && previous.body_fat !== null) {
      bodyFatChange = latest.body_fat - previous.body_fat;
    }
    
    return { weightChange, bodyFatChange };
  };
  
  const changes = calculateChange();

  // Рендер элемента записи о прогрессе
  const renderProgressItem = ({ item }: { item: ProgressRecord }) => {
    return (
      <View style={styles.progressItem}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressDate}>{formatDate(item.date)}</Text>
          
          <View style={styles.progressMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Вес:</Text>
              <Text style={styles.metricValue}>{item.weight} кг</Text>
            </View>
            
            {item.body_fat !== null && (
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Процент жира:</Text>
                <Text style={styles.metricValue}>{item.body_fat}%</Text>
              </View>
            )}
          </View>
          
          {item.notes && (
            <Text style={styles.progressNotes}>{item.notes}</Text>
          )}
        </View>
        
        {item.photo_url && (
          <TouchableOpacity style={styles.photoThumbnail}>
            <Image 
              source={{ uri: item.photo_url }} 
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мой прогресс</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddProgress')}
        >
          <Feather name="plus" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4361ee" />
        </View>
      ) : (
        <>
          <View style={styles.currentStatus}>
            <Text style={styles.currentStatusTitle}>Текущие показатели</Text>
            
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Feather name="weight" size={20} color="#4361ee" />
                  <Text style={styles.metricTitle}>Вес</Text>
                </View>
                
                {latestRecord ? (
                  <>
                    <Text style={styles.metricCurrentValue}>{latestRecord.weight} кг</Text>
                    {changes?.weightChange && (
                      <View style={styles.changeIndicator}>
                        <Feather 
                          name={changes.weightChange < 0 ? "arrow-down" : "arrow-up"} 
                          size={16} 
                          color={changes.weightChange < 0 ? "#34d399" : "#f87171"} 
                        />
                        <Text 
                          style={[
                            styles.changeText, 
                            { color: changes.weightChange < 0 ? "#34d399" : "#f87171" }
                          ]}
                        >
                          {Math.abs(changes.weightChange).toFixed(1)} кг
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noDataText}>Нет данных</Text>
                )}
              </View>
              
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Feather name="percent" size={20} color="#4361ee" />
                  <Text style={styles.metricTitle}>Процент жира</Text>
                </View>
                
                {latestRecord && latestRecord.body_fat !== null ? (
                  <>
                    <Text style={styles.metricCurrentValue}>{latestRecord.body_fat}%</Text>
                    {changes?.bodyFatChange && (
                      <View style={styles.changeIndicator}>
                        <Feather 
                          name={changes.bodyFatChange < 0 ? "arrow-down" : "arrow-up"} 
                          size={16} 
                          color={changes.bodyFatChange < 0 ? "#34d399" : "#f87171"} 
                        />
                        <Text 
                          style={[
                            styles.changeText, 
                            { color: changes.bodyFatChange < 0 ? "#34d399" : "#f87171" }
                          ]}
                        >
                          {Math.abs(changes.bodyFatChange).toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noDataText}>Нет данных</Text>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>История измерений</Text>
            
            {progressRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="bar-chart-2" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>
                  У вас пока нет записей о прогрессе
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Нажмите на кнопку "+" чтобы добавить первую запись
                </Text>
              </View>
            ) : (
              <FlatList
                data={progressRecords}
                renderItem={renderProgressItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.progressList}
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
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentStatus: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  currentStatusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
    marginLeft: 6,
  },
  metricCurrentValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  noDataText: {
    fontSize: 16,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  historySection: {
    flex: 1,
    marginHorizontal: 16,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  progressList: {
    paddingBottom: 24,
  },
  progressItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressInfo: {
    flex: 1,
  },
  progressDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  progressMetrics: {
    marginBottom: 8,
  },
  metricItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  progressNotes: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ClientProgressScreen; 