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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons/Feather';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

interface ClientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  user_id: string;
  avatar_url?: string;
}

const ClientEditProfileScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  
  // Поля формы
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    fetchProfile();
  }, []);
  
  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      // Получаем данные профиля клиента
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        throw error;
      }
      
      // Заполняем форму данными профиля
      setProfile(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      
    } catch (error: any) {
      console.error('Ошибка при загрузке профиля:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить данные профиля'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateProfile = async () => {
    if (!profile) return;
    
    // Валидация
    if (!firstName.trim() || !lastName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Имя и фамилия обязательны для заполнения'
      });
      return;
    }
    
    try {
      setSaving(true);
      
      // Обновляем профиль
      const { error } = await supabase
        .from('clients')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null
        })
        .eq('id', profile.id);
      
      if (error) {
        throw error;
      }
      
      // Если email изменился, обновляем его в auth
      if (email !== profile.email && email.trim()) {
        const { error: emailError } = await supabase.auth.updateUser({ 
          email: email.trim() 
        });
        
        if (emailError) {
          Toast.show({
            type: 'warning',
            text1: 'Предупреждение',
            text2: 'Профиль обновлен, но не удалось изменить email'
          });
        } else {
          Toast.show({
            type: 'info',
            text1: 'Информация',
            text2: 'Письмо с подтверждением отправлено на новый email'
          });
        }
      }
      
      Toast.show({
        type: 'success',
        text1: 'Успех',
        text2: 'Профиль успешно обновлен'
      });
      
      navigation.goBack();
      
    } catch (error: any) {
      console.error('Ошибка при обновлении профиля:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось обновить профиль'
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleChangePassword = () => {
    Alert.alert(
      'Изменение пароля',
      'Вы хотите изменить пароль? Мы отправим инструкции на ваш email.',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Отправить',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(profile?.email || '');
              
              if (error) {
                throw error;
              }
              
              Toast.show({
                type: 'success',
                text1: 'Успех',
                text2: 'Инструкции по сбросу пароля отправлены на ваш email'
              });
              
            } catch (error: any) {
              console.error('Ошибка при сбросе пароля:', error.message);
              Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: 'Не удалось отправить инструкции по сбросу пароля'
              });
            }
          }
        }
      ]
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Заголовок */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icons.ArrowLeft size={20} color="#4b5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Редактирование профиля</Text>
          <View style={styles.placeholderRight} />
        </View>
        
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Имя */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Имя</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Введите имя"
                placeholderTextColor="#9ca3af"
              />
            </View>
            
            {/* Фамилия */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Фамилия</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Введите фамилию"
                placeholderTextColor="#9ca3af"
              />
            </View>
            
            {/* Email */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Введите email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            {/* Телефон */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Телефон</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Введите телефон"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>
            
            {/* Кнопка изменения пароля */}
            <TouchableOpacity
              style={styles.passwordButton}
              onPress={handleChangePassword}
            >
              <Icons.Lock size={18} color="#4b5563" />
              <Text style={styles.passwordButtonText}>Изменить пароль</Text>
            </TouchableOpacity>
            
            {/* Кнопка сохранения */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icons.Save size={18} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Сохранить изменения</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollContainer: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  passwordButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ClientEditProfileScreen; 