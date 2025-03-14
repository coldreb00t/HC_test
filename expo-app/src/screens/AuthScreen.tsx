import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import * as Icons from '@expo/vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { ROUTES } from '../constants/routes';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  secretPhrase: string;
}

type UserRole = 'client' | 'trainer';

const AuthScreen = () => {
  const navigation = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('client');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    secretPhrase: ''
  });

  // Проверяем наличие сохраненных токенов при загрузке
  useEffect(() => {
    async function autoLogin() {
      try {
        const savedToken = await AsyncStorage.getItem('hardcase_auth_token');
        const savedRefreshToken = await AsyncStorage.getItem('hardcase_refresh_token');
        const rememberMe = await AsyncStorage.getItem('hardcase_remember_me');
        
        if (savedToken && savedRefreshToken && rememberMe === 'true') {
          setLoading(true);
          console.log('Найдены сохраненные токены, пытаемся автоматически войти...');
          
          try {
            // Попытка восстановить сессию
            const { data, error } = await supabase.auth.setSession({
              access_token: savedToken,
              refresh_token: savedRefreshToken
            });
            
            if (error) {
              console.error('Ошибка восстановления сессии:', error);
              // Удаляем устаревшие токены
              await AsyncStorage.multiRemove([
                'hardcase_auth_token',
                'hardcase_refresh_token',
                'hardcase_user_email',
                'hardcase_remember_me'
              ]);
            } else if (data.user) {
              console.log('Автоматический вход успешен!');
              // Навигация происходит автоматически через App.tsx
            }
          } catch (error) {
            console.error('Ошибка автологина:', error);
          } finally {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Ошибка при проверке токенов:', error);
        setLoading(false);
      }
    }
    
    autoLogin();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Пожалуйста, введите корректный email');
      }
      if (formData.password.length < 6) {
        throw new Error('Пароль должен содержать минимум 6 символов');
      }

      if (isLogin) {
        // Вход в систему
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        // Установка сохранения сессии в зависимости от rememberMe
        if (data.session) {
          // Если пользователь выбрал "Запомнить меня", сохраняем токены в AsyncStorage
          if (rememberMe) {
            try {
              await AsyncStorage.setItem('hardcase_auth_token', data.session.access_token);
              await AsyncStorage.setItem('hardcase_refresh_token', data.session.refresh_token);
              await AsyncStorage.setItem('hardcase_user_email', formData.email);
              await AsyncStorage.setItem('hardcase_remember_me', 'true');
              
              console.log('Учетные данные успешно сохранены');
            } catch (storageError) {
              console.error('Ошибка при сохранении токенов:', storageError);
              Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: 'Не удалось сохранить данные для автоматического входа'
              });
            }
          } else {
            // Если "Запомнить меня" не выбрано, удаляем сохраненные токены
            try {
              await AsyncStorage.multiRemove([
                'hardcase_auth_token',
                'hardcase_refresh_token',
                'hardcase_user_email',
                'hardcase_remember_me'
              ]);
            } catch (storageError) {
              console.error('Ошибка при очистке токенов:', storageError);
            }
          }
        }
        
        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('Неверный email или пароль');
          }
          throw error;
        }
        
        Toast.show({
          type: 'success',
          text1: 'Успешный вход!',
        });
        // Навигация происходит автоматически через App.tsx
      } else {
        // Регистрация
        if (role === 'trainer') {
          if (!formData.firstName.trim() || !formData.lastName.trim()) {
            throw new Error('Имя и фамилия обязательны для тренеров');
          }
          if (formData.secretPhrase !== 'start') {
            throw new Error('Неверная секретная фраза');
          }
        }
        if (!formData.email.trim() || !formData.password.trim()) {
          throw new Error('Email и пароль обязательны');
        }

        // Регистрация пользователя
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              role: role
            }
          }
        });

        if (authError) {
          if (authError.message.includes('User already registered')) {
            throw new Error('Пользователь с таким email уже существует. Пожалуйста, войдите.');
          }
          throw authError;
        }
        
        if (!authData.user) throw new Error('Не удалось создать пользователя');

        if (role === 'client') {
          // Создание записи клиента
          const { error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: authData.user.id,
              first_name: formData.firstName,
              last_name: formData.lastName
            });

          if (clientError) {
            console.error('Error creating client record:', clientError);
            throw new Error('Не удалось создать профиль клиента');
          }
        }

        Toast.show({
          type: 'success',
          text1: 'Регистрация успешна!',
          text2: 'Пожалуйста, войдите.'
        });
        setIsLogin(true);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          secretPhrase: ''
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: error.message || 'Ошибка аутентификации'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          {/* Здесь должно быть ваше изображение логотипа */}
          <Text style={styles.logoText}>HARDCASE</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{isLogin ? 'Вход' : 'Регистрация'}</Text>
            <Text style={styles.subtitle}>
              {isLogin 
                ? 'Войдите, чтобы получить доступ к вашему аккаунту' 
                : 'Создайте аккаунт для начала занятий'}
            </Text>
          </View>

          <View style={styles.cardBody}>
            {/* Role Selection (only for registration) */}
            {!isLogin && (
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'client' && styles.roleButtonActive
                  ]}
                  onPress={() => setRole('client')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    role === 'client' && styles.roleButtonTextActive
                  ]}>
                    Клиент
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'trainer' && styles.roleButtonActive
                  ]}
                  onPress={() => setRole('trainer')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    role === 'trainer' && styles.roleButtonTextActive
                  ]}>
                    Тренер
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Name fields (only for registration) */}
            {!isLogin && (
              <View style={styles.nameFieldsContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Имя</Text>
                  <View style={styles.inputWrapper}>
                    <Icons.User size={18} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Имя"
                      placeholderTextColor="#6b7280"
                      value={formData.firstName}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Фамилия</Text>
                  <View style={styles.inputWrapper}>
                    <Icons.User size={18} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Фамилия"
                      placeholderTextColor="#6b7280"
                      value={formData.lastName}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Secret phrase (only for trainer registration) */}
            {!isLogin && role === 'trainer' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Секретная фраза</Text>
                <View style={styles.inputWrapper}>
                  <Icons.Lock size={18} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Секретная фраза для тренеров"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={true}
                    value={formData.secretPhrase}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, secretPhrase: text }))}
                  />
                </View>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Icons.Mail size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Пароль</Text>
              <View style={styles.inputWrapper}>
                <Icons.Lock size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Минимум 6 символов"
                  placeholderTextColor="#6b7280"
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                />
                <TouchableOpacity 
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icons.Eye size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember me (only for login) */}
            {isLogin && (
              <View style={styles.rememberContainer}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: '#374151', true: '#f97316' }}
                  thumbColor={rememberMe ? '#fff' : '#9ca3af'}
                />
                <Text style={styles.rememberText}>Запомнить меня</Text>
              </View>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>
                    {isLogin ? 'Войти' : 'Зарегистрироваться'}
                  </Text>
                  <Icons.ArrowRight size={18} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>
              {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsLogin(!isLogin);
                setFormData({
                  firstName: '',
                  lastName: '',
                  email: '',
                  password: '',
                  secretPhrase: ''
                });
              }}
            >
              <Text style={styles.footerLink}>
                {isLogin ? 'Зарегистрироваться' : 'Войти'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f97316',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  cardBody: {
    padding: 20,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 8,
    marginBottom: 15,
    padding: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  roleButtonActive: {
    backgroundColor: '#f97316',
  },
  roleButtonText: {
    color: '#d1d5db',
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  nameFieldsContainer: {
    marginBottom: 15,
    gap: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d1d5db',
    marginBottom: 5,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
  },
  inputIcon: {
    marginLeft: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    paddingVertical: 12,
    paddingLeft: 10,
    paddingRight: 10,
  },
  passwordToggle: {
    padding: 10,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberText: {
    marginLeft: 8,
    color: '#d1d5db',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#f97316',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  cardFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  footerLink: {
    color: '#f97316',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 5,
  },
});

export default AuthScreen; 