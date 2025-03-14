import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Icons from '@expo/vector-icons/Feather';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

type RootStackParamList = {
  ExerciseDetails: { exerciseId: string };
};

type ExerciseDetailsRouteProp = RouteProp<RootStackParamList, 'ExerciseDetails'>;
type ExerciseDetailsNavigationProp = StackNavigationProp<RootStackParamList>;

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  sets: number;
  reps: number;
  weight: number | null;
  rest_time: number | null;
  notes: string | null;
  workout_id: string;
  category?: string;
  exercise_type?: string;
}

interface ExerciseSet {
  id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number | null;
  completed: boolean;
  notes: string | null;
}

const ExerciseDetailsScreen = () => {
  const navigation = useNavigation<ExerciseDetailsNavigationProp>();
  const route = useRoute<ExerciseDetailsRouteProp>();
  const { exerciseId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [notes, setNotes] = useState('');
  
  useEffect(() => {
    fetchExerciseDetails();
  }, [exerciseId]);
  
  const fetchExerciseDetails = async () => {
    try {
      setLoading(true);
      
      // Получаем данные об упражнении
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();
      
      if (exerciseError) {
        throw exerciseError;
      }
      
      setExercise(exerciseData);
      setNotes(exerciseData.notes || '');
      
      // Получаем все подходы для упражнения
      const { data: setsData, error: setsError } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('set_number', { ascending: true });
      
      if (setsError) {
        throw setsError;
      }
      
      setSets(setsData || []);
      
    } catch (error: any) {
      console.error('Ошибка при загрузке данных упражнения:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить данные упражнения'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleSetCompletion = async (setId: string, currentStatus: boolean) => {
    try {
      // Обновляем состояние локально для мгновенной обратной связи
      setSets(currentSets => 
        currentSets.map(set => 
          set.id === setId ? { ...set, completed: !currentStatus } : set
        )
      );
      
      // Отправляем изменения на сервер
      const { error } = await supabase
        .from('workout_sets')
        .update({ completed: !currentStatus })
        .eq('id', setId);
      
      if (error) {
        throw error;
      }
      
    } catch (error: any) {
      console.error('Ошибка при обновлении статуса подхода:', error.message);
      // Возвращаем предыдущее состояние в случае ошибки
      setSets(currentSets => 
        currentSets.map(set => 
          set.id === setId ? { ...set, completed: currentStatus } : set
        )
      );
      
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось обновить статус подхода'
      });
    }
  };
  
  const handleUpdateNotes = async () => {
    if (!exercise) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('exercises')
        .update({ notes })
        .eq('id', exercise.id);
      
      if (error) {
        throw error;
      }
      
      Toast.show({
        type: 'success',
        text1: 'Сохранено',
        text2: 'Заметки успешно сохранены'
      });
      
    } catch (error: any) {
      console.error('Ошибка при сохранении заметок:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось сохранить заметки'
      });
    } finally {
      setSaving(false);
    }
  };
  
  const isAllSetsCompleted = () => {
    return sets.length > 0 && sets.every(set => set.completed);
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Загрузка упражнения...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icons.ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Детали упражнения</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {exercise && (
          <View style={styles.exerciseContainer}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              {exercise.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{exercise.category}</Text>
                </View>
              )}
            </View>

            {exercise.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Описание</Text>
                <Text style={styles.description}>{exercise.description}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Тип упражнения</Text>
              <Text style={styles.infoText}>
                {exercise.exercise_type || 'Не указан'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Рекомендации</Text>
              <View style={styles.tipContainer}>
                <Icons.Check size={20} color="#10b981" style={styles.tipIcon} />
                <Text style={styles.tipText}>
                  Следите за правильной техникой выполнения
                </Text>
              </View>
              <View style={styles.tipContainer}>
                <Icons.Check size={20} color="#10b981" style={styles.tipIcon} />
                <Text style={styles.tipText}>
                  Начинайте с меньшего веса и постепенно увеличивайте нагрузку
                </Text>
              </View>
              <View style={styles.tipContainer}>
                <Icons.Check size={20} color="#10b981" style={styles.tipIcon} />
                <Text style={styles.tipText}>
                  Делайте разминку перед выполнением упражнения
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Целевые мышцы</Text>
              <Text style={styles.infoText}>
                Информация о целевых мышцах будет добавлена позже
              </Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 32,
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
  exerciseContainer: {
    padding: 16,
  },
  exerciseHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 14,
    color: '#4b5563',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  infoText: {
    fontSize: 16,
    color: '#4b5563',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
});

export default ExerciseDetailsScreen; 