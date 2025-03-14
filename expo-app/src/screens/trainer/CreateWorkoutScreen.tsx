import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StackNavigationProp } from '@react-navigation/stack';

import { supabase } from '../../lib/supabase';
import { Client, Exercise } from '../../types/models';
import { TrainerStackParamList } from '../../types/navigation.types';

type CreateWorkoutRouteProp = RouteProp<TrainerStackParamList, 'CreateWorkout'>;
type CreateWorkoutScreenNavigationProp = StackNavigationProp<TrainerStackParamList, 'CreateWorkout'>;

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  rest_time: number;
  notes?: string;
}

const CreateWorkoutScreen = () => {
  const navigation = useNavigation<CreateWorkoutScreenNavigationProp>();
  const route = useRoute<CreateWorkoutRouteProp>();
  const { clientId } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId || null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);

  // Получаем данные тренера и клиентов при загрузке экрана
  useEffect(() => {
    const fetchInitialData = async () => {
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

        setTrainerId(trainerData.id);

        // Получаем список клиентов
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('trainer_id', trainerData.id)
          .order('first_name');

        if (clientsError) {
          console.error('Ошибка при получении списка клиентов:', clientsError);
        } else {
          setClients(clientsData || []);
        }

        // Получаем список упражнений
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('*')
          .order('name');

        if (exercisesError) {
          console.error('Ошибка при получении списка упражнений:', exercisesError);
        } else {
          setExercises(exercisesData || []);
          setFilteredExercises(exercisesData || []);
        }
      } catch (error: any) {
        console.error('Ошибка при загрузке данных:', error);
        Toast.show({
          type: 'error',
          text1: 'Ошибка загрузки',
          text2: error.message || 'Не удалось загрузить необходимые данные',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Функция для фильтрации упражнений
  const handleSearchExercises = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredExercises(exercises);
    } else {
      const query = text.toLowerCase();
      const filtered = exercises.filter(exercise => 
        exercise.name.toLowerCase().includes(query) ||
        (exercise.muscle_group && exercise.muscle_group.toLowerCase().includes(query)) ||
        (exercise.equipment && exercise.equipment.toLowerCase().includes(query))
      );
      setFilteredExercises(filtered);
    }
  };

  // Функция для выбора даты
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setWorkoutDate(selectedDate);
    }
  };

  // Функция для добавления упражнения в тренировку
  const handleAddExercise = (exercise: Exercise) => {
    const newWorkoutExercise: WorkoutExercise = {
      id: Date.now().toString(), // временный id для UI
      exercise_id: exercise.id,
      name: exercise.name,
      sets: 3,
      reps: 10,
      weight: 0,
      rest_time: 60,
    };
    
    setWorkoutExercises([...workoutExercises, newWorkoutExercise]);
    setShowExercisePicker(false);
    setSearchQuery('');
    setFilteredExercises(exercises);
  };

  // Функция для удаления упражнения из тренировки
  const handleRemoveExercise = (id: string) => {
    setWorkoutExercises(workoutExercises.filter(ex => ex.id !== id));
  };

  // Функция для обновления параметров упражнения
  const handleUpdateExercise = (id: string, field: string, value: string | number) => {
    setWorkoutExercises(
      workoutExercises.map(ex => 
        ex.id === id 
          ? { ...ex, [field]: typeof value === 'string' && field !== 'notes' ? parseInt(value) || 0 : value } 
          : ex
      )
    );
  };

  // Функция для выбора клиента
  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setShowClientPicker(false);
  };

  // Функция для создания тренировки
  const handleCreateWorkout = async () => {
    // Проверяем заполнение обязательных полей
    if (!workoutName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Введите название тренировки',
      });
      return;
    }

    if (!selectedClientId) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Выберите клиента для тренировки',
      });
      return;
    }

    if (workoutExercises.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Добавьте хотя бы одно упражнение',
      });
      return;
    }

    try {
      setSaving(true);
      
      // Форматируем дату в строку YYYY-MM-DD
      const formattedDate = workoutDate.toISOString().split('T')[0];

      // Создаем новую тренировку
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: workoutName,
          description: workoutDescription,
          date: formattedDate,
          client_id: selectedClientId,
          trainer_id: trainerId,
          status: 'scheduled', // По умолчанию тренировка запланирована
        })
        .select('id')
        .single();

      if (workoutError) {
        throw new Error('Ошибка при создании тренировки');
      }

      const workoutId = workoutData.id;

      // Добавляем упражнения к тренировке
      const workoutExercisesData = workoutExercises.map((ex, index) => ({
        workout_id: workoutId,
        exercise_id: ex.exercise_id,
        order: index + 1,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        rest_time: ex.rest_time,
        notes: ex.notes || null,
      }));

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(workoutExercisesData);

      if (exercisesError) {
        throw new Error('Ошибка при добавлении упражнений к тренировке');
      }

      Toast.show({
        type: 'success',
        text1: 'Успешно',
        text2: 'Тренировка успешно создана',
      });

      // Переходим на экран деталей тренировки
      navigation.navigate('WorkoutDetails', { workoutId });
    } catch (error: any) {
      console.error('Ошибка при создании тренировки:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка сохранения',
        text2: error.message || 'Не удалось создать тренировку',
      });
    } finally {
      setSaving(false);
    }
  };

  // Функция для отображения имени выбранного клиента
  const getSelectedClientName = () => {
    if (!selectedClientId) return 'Выберите клиента';
    const client = clients.find(c => c.id === selectedClientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Выберите клиента';
  };

  // Форматирование даты для отображения
  const formatDate = (date: Date) => {
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Создание тренировки</Text>
          <TouchableOpacity onPress={handleCreateWorkout} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#4361ee" />
            ) : (
              <Feather name="check" size={24} color="#4361ee" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Основная информация о тренировке */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Основная информация</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Название тренировки*</Text>
              <TextInput
                style={styles.textInput}
                value={workoutName}
                onChangeText={setWorkoutName}
                placeholder="Введите название тренировки"
                placeholderTextColor="#9ca3af"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Описание</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={workoutDescription}
                onChangeText={setWorkoutDescription}
                placeholder="Введите описание тренировки"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Дата тренировки*</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>{formatDate(workoutDate)}</Text>
                <Feather name="calendar" size={20} color="#4361ee" />
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={workoutDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Клиент*</Text>
              <TouchableOpacity 
                style={styles.clientPickerButton}
                onPress={() => setShowClientPicker(true)}
              >
                <Text 
                  style={[
                    styles.clientPickerText, 
                    !selectedClientId && styles.clientPickerPlaceholder
                  ]}
                >
                  {getSelectedClientName()}
                </Text>
                <Feather name="chevron-down" size={20} color="#4361ee" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Список упражнений */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Упражнения</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowExercisePicker(true)}
              >
                <Text style={styles.addButtonText}>+ Добавить</Text>
              </TouchableOpacity>
            </View>
            
            {workoutExercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="activity" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>Нет упражнений</Text>
                <Text style={styles.emptyStateText}>
                  Добавьте упражнения в тренировку
                </Text>
              </View>
            ) : (
              workoutExercises.map((exercise, index) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseNumber}>{index + 1}</Text>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <TouchableOpacity 
                      onPress={() => handleRemoveExercise(exercise.id)}
                      style={styles.removeButton}
                    >
                      <Feather name="trash-2" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.exerciseParams}>
                    <View style={styles.exerciseParamContainer}>
                      <Text style={styles.exerciseParamLabel}>Подходы</Text>
                      <TextInput
                        style={styles.exerciseParamInput}
                        value={exercise.sets.toString()}
                        onChangeText={(value) => handleUpdateExercise(exercise.id, 'sets', value)}
                        keyboardType="numeric"
                      />
                    </View>
                    
                    <View style={styles.exerciseParamContainer}>
                      <Text style={styles.exerciseParamLabel}>Повторы</Text>
                      <TextInput
                        style={styles.exerciseParamInput}
                        value={exercise.reps.toString()}
                        onChangeText={(value) => handleUpdateExercise(exercise.id, 'reps', value)}
                        keyboardType="numeric"
                      />
                    </View>
                    
                    <View style={styles.exerciseParamContainer}>
                      <Text style={styles.exerciseParamLabel}>Вес (кг)</Text>
                      <TextInput
                        style={styles.exerciseParamInput}
                        value={exercise.weight.toString()}
                        onChangeText={(value) => handleUpdateExercise(exercise.id, 'weight', value)}
                        keyboardType="numeric"
                      />
                    </View>
                    
                    <View style={styles.exerciseParamContainer}>
                      <Text style={styles.exerciseParamLabel}>Отдых (сек)</Text>
                      <TextInput
                        style={styles.exerciseParamInput}
                        value={exercise.rest_time.toString()}
                        onChangeText={(value) => handleUpdateExercise(exercise.id, 'rest_time', value)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.exerciseNotes}>
                    <Text style={styles.exerciseNotesLabel}>Примечания</Text>
                    <TextInput
                      style={styles.exerciseNotesInput}
                      value={exercise.notes || ''}
                      onChangeText={(value) => handleUpdateExercise(exercise.id, 'notes', value)}
                      placeholder="Дополнительные инструкции"
                      placeholderTextColor="#9ca3af"
                      multiline
                    />
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Кнопка создания тренировки */}
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateWorkout}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Feather name="save" size={18} color="#ffffff" />
                <Text style={styles.createButtonText}>Создать тренировку</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Модальное окно выбора клиента */}
        {showClientPicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выберите клиента</Text>
                <TouchableOpacity onPress={() => setShowClientPicker(false)}>
                  <Feather name="x" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              
              {clients.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>У вас пока нет клиентов</Text>
                </View>
              ) : (
                <FlatList
                  data={clients}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.clientItem}
                      onPress={() => handleSelectClient(item)}
                    >
                      <Text style={styles.clientItemName}>
                        {item.first_name} {item.last_name}
                      </Text>
                      <Text style={styles.clientItemEmail}>{item.email}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        )}

        {/* Модальное окно выбора упражнения */}
        {showExercisePicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выберите упражнение</Text>
                <TouchableOpacity onPress={() => {
                  setShowExercisePicker(false);
                  setSearchQuery('');
                  setFilteredExercises(exercises);
                }}>
                  <Feather name="x" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Feather name="search" size={20} color="#6b7280" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={handleSearchExercises}
                  placeholder="Поиск по названию, группе мышц, оборудованию"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              {filteredExercises.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Упражнения не найдены</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredExercises}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.exerciseItem}
                      onPress={() => handleAddExercise(item)}
                    >
                      <View style={styles.exerciseItemInfo}>
                        <Text style={styles.exerciseItemName}>{item.name}</Text>
                        {item.muscle_group && (
                          <Text style={styles.exerciseItemDetail}>
                            Группа мышц: {item.muscle_group}
                          </Text>
                        )}
                        {item.equipment && (
                          <Text style={styles.exerciseItemDetail}>
                            Оборудование: {item.equipment}
                          </Text>
                        )}
                      </View>
                      <Feather name="plus-circle" size={24} color="#4361ee" />
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
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
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  datePickerText: {
    fontSize: 16,
    color: '#111827',
  },
  clientPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  clientPickerText: {
    fontSize: 16,
    color: '#111827',
  },
  clientPickerPlaceholder: {
    color: '#9ca3af',
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4361ee',
  },
  exerciseCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4361ee',
    color: '#ffffff',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    padding: 4,
  },
  exerciseParams: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  exerciseParamContainer: {
    width: '50%',
    paddingRight: 8,
    marginBottom: 12,
  },
  exerciseParamLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  exerciseParamInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  exerciseNotes: {
    marginTop: 4,
  },
  exerciseNotesLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  exerciseNotesInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#4361ee',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  clientItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  clientItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  clientItemEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
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
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  exerciseItemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  exerciseItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  exerciseItemDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  },
});

export default CreateWorkoutScreen; 