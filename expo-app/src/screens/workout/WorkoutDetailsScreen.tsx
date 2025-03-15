import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

interface WorkoutSet {
  id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  completed: boolean;
  notes: string | null;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  workout_id: string;
  name: string;
  sets: WorkoutSet[];
  description: string | null;
  video_url: string | null;
  image_url: string | null;
  muscle_group: string | null;
  equipment: string | null;
  order_index: number;
}

interface Workout {
  id: string;
  name: string;
  description: string | null;
  date: string;
  status: string;
  client_id: string;
  trainer_id: string;
  exercises: WorkoutExercise[];
  total_sets: number;
  completed_sets: number;
}

type RootStackParamList = {
  WorkoutDetails: { workoutId: string };
};

type WorkoutDetailsRouteProp = RouteProp<RootStackParamList, 'WorkoutDetails'>;
type WorkoutDetailsNavigationProp = StackNavigationProp<RootStackParamList>;

const WorkoutDetailsScreen = () => {
  const navigation = useNavigation<WorkoutDetailsNavigationProp>();
  const route = useRoute<WorkoutDetailsRouteProp>();
  const { workoutId } = route.params;
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<{ [key: string]: boolean }>({});
  const [exerciseNotes, setExerciseNotes] = useState<{ [key: string]: string }>({});
  
  useEffect(() => {
    fetchWorkoutDetails();
  }, [workoutId]);
  
  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      
      // Запрос данных тренировки
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();
      
      if (workoutError) throw workoutError;
      
      // Запрос упражнений для тренировки
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select(`
          *,
          exercises (
            name,
            description,
            video_url,
            image_url,
            muscle_group,
            equipment
          )
        `)
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });
      
      if (exercisesError) throw exercisesError;
      
      // Запрос сетов для каждого упражнения
      const workoutExercises: WorkoutExercise[] = [];
      let totalSets = 0;
      let completedSets = 0;
      
      // Инициализируем состояние развернутых упражнений
      const initialExpandedState: { [key: string]: boolean } = {};
      const initialNotesState: { [key: string]: string } = {};
      
      for (const exercise of exercisesData) {
        const { data: setsData, error: setsError } = await supabase
          .from('exercise_sets')
          .select('*')
          .eq('exercise_id', exercise.id)
          .order('id', { ascending: true });
        
        if (setsError) throw setsError;
        
        // Форматируем данные упражнения
        const formattedExercise: WorkoutExercise = {
          id: exercise.id,
          exercise_id: exercise.exercises.id || exercise.exercise_id,
          workout_id: workoutId,
          name: exercise.exercises.name,
          sets: setsData || [],
          description: exercise.exercises.description,
          video_url: exercise.exercises.video_url,
          image_url: exercise.exercises.image_url,
          muscle_group: exercise.exercises.muscle_group,
          equipment: exercise.exercises.equipment,
          order_index: exercise.order_index
        };
        
        // Считаем общее количество сетов и выполненных сетов
        totalSets += setsData.length;
        completedSets += setsData.filter((set: WorkoutSet) => set.completed).length;
        
        // Устанавливаем начальное состояние для развернутых упражнений (первое открыто, остальные закрыты)
        initialExpandedState[exercise.id] = workoutExercises.length === 0;
        
        // Инициализируем заметки к упражнениям
        initialNotesState[exercise.id] = '';
        
        workoutExercises.push(formattedExercise);
      }
      
      // Формируем полный объект тренировки
      const fullWorkout: Workout = {
        ...workoutData,
        exercises: workoutExercises,
        total_sets: totalSets,
        completed_sets: completedSets
      };
      
      setWorkout(fullWorkout);
      setExpandedExercises(initialExpandedState);
      setExerciseNotes(initialNotesState);
      
    } catch (error: any) {
      console.error('Ошибка при загрузке данных тренировки:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить тренировку'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const toggleExerciseExpand = (exerciseId: string) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };
  
  const toggleSetCompleted = async (exerciseId: string, setId: string, currentStatus: boolean) => {
    if (!workout) return;
    
    try {
      setUpdating(true);
      
      // Обновляем статус сета в базе данных
      const { error } = await supabase
        .from('exercise_sets')
        .update({ completed: !currentStatus })
        .eq('id', setId);
      
      if (error) throw error;
      
      // Обновляем локальное состояние
      const updatedExercises = workout.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          const updatedSets = exercise.sets.map(set => {
            if (set.id === setId) {
              return { ...set, completed: !currentStatus };
            }
            return set;
          });
          return { ...exercise, sets: updatedSets };
        }
        return exercise;
      });
      
      // Пересчитываем общее количество выполненных сетов
      const newCompletedSets = updatedExercises.reduce((total, exercise) => {
        return total + exercise.sets.filter(set => set.completed).length;
      }, 0);
      
      // Определяем новый статус тренировки
      let newStatus = workout.status;
      if (newCompletedSets === workout.total_sets) {
        newStatus = 'completed';
      } else if (newCompletedSets > 0) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'pending';
      }
      
      // Обновляем статус тренировки в базе данных, если он изменился
      if (newStatus !== workout.status) {
        const { error: workoutError } = await supabase
          .from('workouts')
          .update({ status: newStatus })
          .eq('id', workoutId);
        
        if (workoutError) throw workoutError;
      }
      
      // Обновляем локальное состояние тренировки
      setWorkout({
        ...workout,
        exercises: updatedExercises,
        completed_sets: newCompletedSets,
        status: newStatus
      });
      
      Toast.show({
        type: 'success',
        text1: currentStatus ? 'Сет отмечен как невыполненный' : 'Сет отмечен как выполненный',
        visibilityTime: 1500
      });
      
    } catch (error: any) {
      console.error('Ошибка при обновлении статуса сета:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось обновить статус'
      });
    } finally {
      setUpdating(false);
    }
  };
  
  const saveExerciseNotes = async (exerciseId: string) => {
    if (!workout || !exerciseNotes[exerciseId]) return;
    
    try {
      setUpdating(true);
      
      // Создаем запись заметки в базе данных
      const { error } = await supabase
        .from('exercise_notes')
        .insert({
          exercise_id: exerciseId,
          note: exerciseNotes[exerciseId],
          timestamp: new Date().toISOString()
        });
      
      if (error) throw error;
      
      Toast.show({
        type: 'success',
        text1: 'Заметка сохранена',
        visibilityTime: 1500
      });
      
      // Очищаем поле ввода заметки
      setExerciseNotes(prev => ({
        ...prev,
        [exerciseId]: ''
      }));
      
    } catch (error: any) {
      console.error('Ошибка при сохранении заметки:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось сохранить заметку'
      });
    } finally {
      setUpdating(false);
    }
  };
  
  const renderExerciseCard = (exercise: WorkoutExercise) => {
    const isExpanded = expandedExercises[exercise.id];
    const completedSets = exercise.sets.filter(set => set.completed).length;
    const totalSets = exercise.sets.length;
    
    return (
      <View key={exercise.id} style={styles.exerciseCard}>
        <TouchableOpacity 
          style={styles.exerciseHeader}
          onPress={() => toggleExerciseExpand(exercise.id)}
        >
          <View style={styles.exerciseHeaderLeft}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseProgress}>
              {completedSets}/{totalSets} сетов
            </Text>
          </View>
          <View style={styles.exerciseHeaderRight}>
            <Feather 
              name="chevron-down"
              size={20} 
              color="#6b7280" 
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.exerciseContent}>
            {exercise.description && (
              <Text style={styles.exerciseDescription}>
                {exercise.description}
              </Text>
            )}
            
            <View style={styles.setsList}>
              <View style={styles.setsHeader}>
                <Text style={[styles.setHeaderText, { flex: 0.5 }]}>Сет</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>Вес (кг)</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>Повторения</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>Статус</Text>
              </View>
              
              {exercise.sets.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <Text style={[styles.setText, { flex: 0.5 }]}>{index + 1}</Text>
                  <Text style={[styles.setText, { flex: 1 }]}>{set.weight}</Text>
                  <Text style={[styles.setText, { flex: 1 }]}>{set.reps}</Text>
                  <TouchableOpacity 
                    style={[
                      styles.statusButton,
                      set.completed ? styles.completedButton : styles.pendingButton
                    ]}
                    onPress={() => toggleSetCompleted(exercise.id, set.id, set.completed)}
                    disabled={updating}
                  >
                    <Text style={styles.statusButtonText}>
                      {set.completed ? 'Выполнен' : 'Ожидает'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            
            <View style={styles.notesContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="Добавить заметку к упражнению..."
                placeholderTextColor="#9ca3af"
                multiline
                value={exerciseNotes[exercise.id] || ''}
                onChangeText={(text) => setExerciseNotes(prev => ({
                  ...prev,
                  [exercise.id]: text
                }))}
              />
              <TouchableOpacity
                style={styles.saveNotesButton}
                onPress={() => saveExerciseNotes(exercise.id)}
                disabled={!exerciseNotes[exercise.id] || updating}
              >
                <Text style={styles.saveNotesButtonText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  
  if (!workout) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Тренировка не найдена</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={20} color="#4b5563" />
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Верхний заголовок */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={20} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{workout.name}</Text>
        <View style={styles.placeholderRight} />
      </View>
      
      <ScrollView style={styles.content}>
        {/* Информация о тренировке */}
        <View style={styles.workoutInfoCard}>
          <Text style={styles.workoutDate}>
            {new Date(workout.date).toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
          
          {workout.description && (
            <Text style={styles.workoutDescription}>
              {workout.description}
            </Text>
          )}
          
          <View style={styles.progressContainer}>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressLabel}>Прогресс тренировки</Text>
              <Text style={styles.progressValue}>
                {workout.completed_sets}/{workout.total_sets} сетов
              </Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { 
                    width: `${(workout.completed_sets / workout.total_sets) * 100}%`,
                    backgroundColor: workout.completed_sets === workout.total_sets 
                      ? '#22c55e' // зеленый если все выполнено
                      : '#f97316' // оранжевый в процессе
                  }
                ]}
              />
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Статус:</Text>
            <View style={[
              styles.statusBadge,
              workout.status === 'completed' ? styles.completedBadge :
              workout.status === 'in_progress' ? styles.inProgressBadge :
              styles.pendingBadge
            ]}>
              <Text style={styles.statusBadgeText}>
                {workout.status === 'completed' ? 'Завершена' :
                 workout.status === 'in_progress' ? 'Выполняется' :
                 'Ожидает выполнения'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Список упражнений */}
        <View style={styles.exercisesContainer}>
          <Text style={styles.sectionTitle}>Упражнения</Text>
          
          {workout.exercises.length > 0 ? (
            workout.exercises.map(exercise => renderExerciseCard(exercise))
          ) : (
            <View style={styles.noExercisesContainer}>
              <Text style={styles.noExercisesText}>
                В этой тренировке нет упражнений
              </Text>
            </View>
          )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
    textAlign: 'center',
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
  content: {
    flex: 1,
    padding: 16,
  },
  workoutInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutDate: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#4b5563',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  inProgressBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  exercisesContainer: {
    marginBottom: 20,
  },
  exerciseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  exerciseHeaderLeft: {
    flex: 1,
  },
  exerciseHeaderRight: {
    marginLeft: 16,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  exerciseProgress: {
    fontSize: 14,
    color: '#6b7280',
  },
  expandIcon: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  exerciseContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  setsList: {
    marginBottom: 16,
  },
  setsHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  setHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  setText: {
    fontSize: 14,
    color: '#4b5563',
  },
  statusButton: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  completedButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  pendingButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: 8,
  },
  notesInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    height: 80,
    color: '#1f2937',
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  saveNotesButton: {
    backgroundColor: '#f97316',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveNotesButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  noExercisesContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
  },
  noExercisesText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  backButtonText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: '500',
  }
});

export default WorkoutDetailsScreen; 