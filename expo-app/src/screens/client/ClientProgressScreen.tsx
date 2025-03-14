import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { supabase } from '../../lib/supabase';
import { ProgressRecord } from '../../lib/supabase';

export default function ClientProgressScreen() {
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProgressRecords();
  }, []);

  const fetchProgressRecords = async () => {
    try {
      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('Пользователь не найден');

      // Получаем профиль клиента
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      if (!clientData) throw new Error('Профиль клиента не найден');

      // Получаем записи о прогрессе
      const { data: progressData, error: progressError } = await supabase
        .from('progress_records')
        .select('*')
        .eq('client_id', clientData.id)
        .order('date', { ascending: false });

      if (progressError) throw progressError;

      setProgressRecords(progressData || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: error.message || 'Не удалось загрузить данные о прогрессе',
      });
      console.error('Ошибка загрузки данных о прогрессе:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProgressRecords();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Загрузка данных о прогрессе...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <View style={styles.header}>
        <Text style={styles.title}>Мой прогресс</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4361ee']}
          />
        }
      >
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Сводка</Text>
          
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Feather name="activity" size={24} color="#4361ee" style={styles.summaryIcon} />
              <Text style={styles.summaryValue}>
                {progressRecords.length > 0 ? progressRecords[0].weight || '-' : '-'}
              </Text>
              <Text style={styles.summaryLabel}>Текущий вес (кг)</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Feather name="percent" size={24} color="#4361ee" style={styles.summaryIcon} />
              <Text style={styles.summaryValue}>
                {progressRecords.length > 0 ? progressRecords[0].body_fat_percentage || '-' : '-'}
              </Text>
              <Text style={styles.summaryLabel}>Процент жира (%)</Text>
            </View>
          </View>
        </View>

        <View style={styles.historyContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>История измерений</Text>
            <TouchableOpacity style={styles.addButton}>
              <Feather name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Добавить</Text>
            </TouchableOpacity>
          </View>
          
          {progressRecords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="bar-chart-2" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>Нет данных о прогрессе</Text>
              <Text style={styles.emptyText}>
                Добавьте свои первые измерения, чтобы начать отслеживать прогресс
              </Text>
            </View>
          ) : (
            progressRecords.map((record) => (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                </View>
                
                <View style={styles.recordDetails}>
                  {record.weight && (
                    <View style={styles.recordItem}>
                      <Text style={styles.recordLabel}>Вес:</Text>
                      <Text style={styles.recordValue}>{record.weight} кг</Text>
                    </View>
                  )}
                  
                  {record.body_fat_percentage && (
                    <View style={styles.recordItem}>
                      <Text style={styles.recordLabel}>Процент жира:</Text>
                      <Text style={styles.recordValue}>{record.body_fat_percentage}%</Text>
                    </View>
                  )}
                  
                  {record.measurements && (
                    <>
                      {record.measurements.chest && (
                        <View style={styles.recordItem}>
                          <Text style={styles.recordLabel}>Грудь:</Text>
                          <Text style={styles.recordValue}>{record.measurements.chest} см</Text>
                        </View>
                      )}
                      
                      {record.measurements.waist && (
                        <View style={styles.recordItem}>
                          <Text style={styles.recordLabel}>Талия:</Text>
                          <Text style={styles.recordValue}>{record.measurements.waist} см</Text>
                        </View>
                      )}
                      
                      {record.measurements.hips && (
                        <View style={styles.recordItem}>
                          <Text style={styles.recordLabel}>Бедра:</Text>
                          <Text style={styles.recordValue}>{record.measurements.hips} см</Text>
                        </View>
                      )}
                      
                      {record.measurements.arms && (
                        <View style={styles.recordItem}>
                          <Text style={styles.recordLabel}>Руки:</Text>
                          <Text style={styles.recordValue}>{record.measurements.arms} см</Text>
                        </View>
                      )}
                      
                      {record.measurements.thighs && (
                        <View style={styles.recordItem}>
                          <Text style={styles.recordLabel}>Ноги:</Text>
                          <Text style={styles.recordValue}>{record.measurements.thighs} см</Text>
                        </View>
                      )}
                    </>
                  )}
                  
                  {record.notes && (
                    <View style={styles.recordNotes}>
                      <Text style={styles.recordNotesLabel}>Заметки:</Text>
                      <Text style={styles.recordNotesText}>{record.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  summaryContainer: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4361ee',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryIcon: {
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  historyContainer: {
    padding: 16,
    paddingTop: 0,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  recordHeader: {
    backgroundColor: '#4361ee',
    padding: 12,
  },
  recordDate: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recordDetails: {
    padding: 16,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  recordValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  recordNotes: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  recordNotesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  recordNotesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
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