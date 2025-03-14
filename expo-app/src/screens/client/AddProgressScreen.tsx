import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

import { supabase } from '../../lib/supabase';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClientStackParamList } from '../../types/navigation.types';

type AddProgressScreenNavigationProp = StackNavigationProp<ClientStackParamList, 'AddProgress'>;

const AddProgressScreen = () => {
  const navigation = useNavigation<AddProgressScreenNavigationProp>();
  const [date, setDate] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  // Функция для выбора изображения из галереи
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Toast.show({
        type: 'error',
        text1: 'Нет доступа к галерее',
        text2: 'Пожалуйста, разрешите доступ к галерее в настройках',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  // Функция для показа/скрытия выбора даты
  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  // Функция для обработки изменения даты
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    setDate(currentDate);
  };

  // Функция валидации данных
  const validateForm = () => {
    if (!weight.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Требуется вес',
        text2: 'Пожалуйста, введите ваш текущий вес',
      });
      return false;
    }

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0 || weightValue > 500) {
      Toast.show({
        type: 'error',
        text1: 'Некорректный вес',
        text2: 'Пожалуйста, введите корректное значение веса (от 1 до 500 кг)',
      });
      return false;
    }

    if (bodyFat.trim()) {
      const bodyFatValue = parseFloat(bodyFat);
      if (isNaN(bodyFatValue) || bodyFatValue < 0 || bodyFatValue > 100) {
        Toast.show({
          type: 'error',
          text1: 'Некорректный процент жира',
          text2: 'Пожалуйста, введите корректное значение (от 0 до 100%)',
        });
        return false;
      }
    }

    return true;
  };

  // Функция для сохранения записи о прогрессе
  const saveProgress = async () => {
    if (!validateForm()) return;

    setLoading(true);

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

      // Загружаем фото, если оно есть
      let photoUrl = null;
      if (photo) {
        const photoName = `progress_${user.id}_${Date.now()}.jpg`;
        const photoPath = `progress_photos/${photoName}`;
        
        // Конвертируем URI в Blob для загрузки
        const response = await fetch(photo);
        const blob = await response.blob();
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('client_photos')
          .upload(photoPath, blob);

        if (uploadError) {
          console.error('Ошибка загрузки фото:', uploadError);
        } else {
          // Получаем публичный URL для фото
          const { data: urlData } = supabase.storage
            .from('client_photos')
            .getPublicUrl(photoPath);
          
          photoUrl = urlData.publicUrl;
        }
      }

      // Создаем запись о прогрессе
      const { data, error } = await supabase
        .from('progress_records')
        .insert([
          {
            client_id: clientData.id,
            date: date.toISOString(),
            weight: parseFloat(weight),
            body_fat: bodyFat ? parseFloat(bodyFat) : null,
            notes: notes.trim() || null,
            photo_url: photoUrl,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error('Ошибка при сохранении прогресса');
      }

      Toast.show({
        type: 'success',
        text1: 'Прогресс сохранен',
        text2: 'Ваши данные успешно записаны',
      });

      // Возвращаемся на предыдущий экран
      navigation.goBack();
    } catch (error: any) {
      console.error('Ошибка при сохранении прогресса:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка при сохранении',
        text2: error.message || 'Пожалуйста, попробуйте еще раз',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Добавить замер</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Дата замера</Text>
          <TouchableOpacity style={styles.dateInput} onPress={toggleDatePicker}>
            <Text style={styles.dateText}>
              {date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
            <Feather name="calendar" size={20} color="#6b7280" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          <Text style={styles.sectionTitle}>Вес (кг)</Text>
          <TextInput
            style={styles.input}
            placeholder="Введите ваш текущий вес"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />

          <Text style={styles.sectionTitle}>Процент жира (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="Необязательно"
            keyboardType="decimal-pad"
            value={bodyFat}
            onChangeText={setBodyFat}
          />

          <Text style={styles.sectionTitle}>Заметки</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Добавьте любые заметки о вашем прогрессе"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />

          <Text style={styles.sectionTitle}>Фото</Text>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.previewImage} />
            ) : (
              <>
                <Feather name="camera" size={24} color="#6b7280" />
                <Text style={styles.photoButtonText}>Добавить фото</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={saveProgress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Сохранить прогресс</Text>
            )}
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  photoButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6b7280',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#4361ee',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: '#a0aec0',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddProgressScreen; 