import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { TrainerParamList, ClientStackParamList } from '../../types/navigation.types';
import useApi from '../../hooks/useApi';
import { getWorkoutDetails, updateWorkoutStatus, Workout, Exercise } from '../../services/workoutService';
import useNotification from '../../hooks/useNotification';

type WorkoutDetailsRouteProp = 
  | RouteProp<TrainerParamList, 'WorkoutDetails'>
  | RouteProp<ClientStackParamList, 'WorkoutDetails'>;

type WorkoutDetailsNavigationProp = 
  | StackNavigationProp<TrainerParamList, 'WorkoutDetails'>
  | StackNavigationProp<ClientStackParamList, 'WorkoutDetails'>;

type Props = {
  route: WorkoutDetailsRouteProp;
  navigation: WorkoutDetailsNavigationProp;
};

const WorkoutDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { userType } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  
  // Получение данных тренировки
  const { 
    data: workout, 
    isLoading,
    error, 
    execute: fetchWorkout 
  } = useApi<Workout>(getWorkoutDetails);
  
  // API для обновления статуса тренировки
  const { 
    isLoading: isStatusUpdating,
    execute: executeStatusUpdate
  } = useApi(updateWorkoutStatus);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const workoutId = route.params.workoutId;
    fetchWorkout(workoutId);
  }, [route.params.workoutId, fetchWorkout]);

  // Если тренировка не найдена, показываем ошибку
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Не удалось загрузить тренировку. Пожалуйста, попробуйте позже.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Переключение отображения деталей упражнения
  const toggleExerciseDetails = (exerciseId: string) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  // Обновление статуса тренировки
  const updateStatus = async (newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    if (!workout) return;
    
    const result = await executeStatusUpdate({ 
      workoutId: workout.id, 
      status: newStatus 
    });
    
    if (result.error) {
      showError('Ошибка', 'Не удалось обновить статус тренировки');
    } else {
      showSuccess('Успешно', 'Статус тренировки обновлен');
      fetchWorkout(workout.id);
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#3b82f6'; // blue
      case 'completed':
        return '#10b981'; // green
      case 'cancelled':
        return '#ef4444'; // red
      default:
        return colors.textSecondary;
    }
  };

  // Получение названия статуса
  const getStatusName = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Запланирована';
      case 'completed':
        return 'Выполнена';
      case 'cancelled':
        return 'Отменена';
      default:
        return 'Неизвестно';
    }
  };

  // Рендер упражнения
  const renderExercise = (exercise: Exercise, index: number) => {
    const isExpanded = !!expandedExercises[exercise.id];
    
    return (
      <View
        key={exercise.id}
        style={[
          styles.exerciseCard,
          { backgroundColor: colors.card, borderColor: colors.border }
        ]}
      >
        <TouchableOpacity
          style={styles.exerciseHeader}
          onPress={() => toggleExerciseDetails(exercise.id)}
        >
          <View style={styles.exerciseNumberContainer}>
            <Text style={[styles.exerciseNumber, { color: colors.primary }]}>
              {index + 1}
            </Text>
          </View>
          <View style={styles.exerciseTitleContainer}>
            <Text style={[styles.exerciseTitle, { color: colors.text }]}>
              {exercise.name}
            </Text>
            <Text style={[styles.exerciseSubtitle, { color: colors.textSecondary }]}>
              {exercise.sets} подх. × {exercise.reps} повт.
              {exercise.weight ? ` × ${exercise.weight} кг` : ''}
            </Text>
          </View>
          <Feather
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.exerciseDetails}>
            {exercise.description && (
              <Text style={[styles.exerciseDescription, { color: colors.text }]}>
                {exercise.description}
              </Text>
            )}
            <View style={styles.exerciseParameters}>
              <View style={styles.parameterItem}>
                <Text style={[styles.parameterLabel, { color: colors.textSecondary }]}>
                  Подходы
                </Text>
                <Text style={[styles.parameterValue, { color: colors.text }]}>
                  {exercise.sets}
                </Text>
              </View>
              <View style={styles.parameterItem}>
                <Text style={[styles.parameterLabel, { color: colors.textSecondary }]}>
                  Повторения
                </Text>
                <Text style={[styles.parameterValue, { color: colors.text }]}>
                  {exercise.reps}
                </Text>
              </View>
              {exercise.weight !== undefined && exercise.weight > 0 && (
                <View style={styles.parameterItem}>
                  <Text style={[styles.parameterLabel, { color: colors.textSecondary }]}>
                    Вес (кг)
                  </Text>
                  <Text style={[styles.parameterValue, { color: colors.text }]}>
                    {exercise.weight}
                  </Text>
                </View>
              )}
              {exercise.duration !== undefined && exercise.duration > 0 && (
                <View style={styles.parameterItem}>
                  <Text style={[styles.parameterLabel, { color: colors.textSecondary }]}>
                    Длительность (сек)
                  </Text>
                  <Text style={[styles.parameterValue, { color: colors.text }]}>
                    {exercise.duration}
                  </Text>
                </View>
              )}
              {exercise.rest_time !== undefined && exercise.rest_time > 0 && (
                <View style={styles.parameterItem}>
                  <Text style={[styles.parameterLabel, { color: colors.textSecondary }]}>
                    Отдых (сек)
                  </Text>
                  <Text style={[styles.parameterValue, { color: colors.text }]}>
                    {exercise.rest_time}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Загрузка данных
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Тренировка не найдена
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Заголовок и информация */}
      <View style={styles.headerSection}>
        <Text style={[styles.title, { color: colors.text }]}>{workout.title}</Text>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {formatDate(workout.date)}
          </Text>
        </View>
        {workout.time && (
          <View style={styles.infoRow}>
            <Feather name="clock" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {workout.time}
            </Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Feather name="check-circle" size={16} color={getStatusColor(workout.status)} />
          <Text
            style={[
              styles.infoText,
              { color: getStatusColor(workout.status) }
            ]}
          >
            {getStatusName(workout.status)}
          </Text>
        </View>
      </View>

      {/* Описание */}
      {workout.description && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Описание</Text>
          <Text style={[styles.description, { color: colors.text }]}>
            {workout.description}
          </Text>
        </View>
      )}

      {/* Информация о клиенте или тренере */}
      {userType === 'trainer' && workout.client && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Клиент</Text>
          <View
            style={[
              styles.participantCard,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <View style={styles.participantInfo}>
              <Text style={[styles.participantName, { color: colors.text }]}>
                {workout.client.first_name} {workout.client.last_name}
              </Text>
              <Text style={[styles.participantEmail, { color: colors.textSecondary }]}>
                {workout.client.email}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Список упражнений */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Упражнения</Text>
        {workout.exercises && workout.exercises.length > 0 ? (
          workout.exercises.map((exercise, index) => renderExercise(exercise, index))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Нет упражнений
          </Text>
        )}
      </View>

      {/* Кнопки действий для тренера */}
      {userType === 'trainer' && (
        <View style={styles.actionButtons}>
          {workout.status === 'scheduled' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                onPress={() => updateStatus('completed')}
                disabled={isStatusUpdating}
              >
                <Feather name="check-circle" size={18} color="#ffffff" />
                <Text style={styles.actionButtonText}>Завершить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                onPress={() => updateStatus('cancelled')}
                disabled={isStatusUpdating}
              >
                <Feather name="x-circle" size={18} color="#ffffff" />
                <Text style={styles.actionButtonText}>Отменить</Text>
              </TouchableOpacity>
            </>
          )}
          {workout.status === 'cancelled' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
              onPress={() => updateStatus('scheduled')}
              disabled={isStatusUpdating}
            >
              <Feather name="refresh-cw" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Восстановить</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Кнопки действий для клиента */}
      {userType === 'client' && workout.status === 'scheduled' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            onPress={() => updateStatus('completed')}
            disabled={isStatusUpdating}
          >
            <Feather name="check-circle" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Отметить как выполненную</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  headerSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  participantCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  participantEmail: {
    fontSize: 14,
  },
  exerciseCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  exerciseNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginRight: 12,
  },
  exerciseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  exerciseTitleContainer: {
    flex: 1,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseSubtitle: {
    fontSize: 14,
  },
  exerciseDetails: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  exerciseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  exerciseParameters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  parameterItem: {
    width: '50%',
    marginBottom: 8,
  },
  parameterLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  parameterValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WorkoutDetailsScreen; 