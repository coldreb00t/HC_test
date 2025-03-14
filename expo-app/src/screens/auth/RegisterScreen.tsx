import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../../../App';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'client' | 'trainer'>('client');
  
  const handleRegister = async () => {
    // Валидация полей
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Пожалуйста, заполните все поля'
      });
      return;
    }
    
    // Проверка совпадения паролей
    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Пароли не совпадают'
      });
      return;
    }
    
    // Проверка сложности пароля
    if (password.length < 8) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Пароль должен содержать не менее 8 символов'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Регистрируем пользователя
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            user_type: userType
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        // Создаем запись в соответствующей таблице (clients или trainers)
        const tableName = userType === 'client' ? 'clients' : 'trainers';
        const { error: profileError } = await supabase
          .from(tableName)
          .insert({
            user_id: data.user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim()
          });
        
        if (profileError) {
          console.error(`Ошибка создания профиля ${userType}:`, profileError.message);
          // Продолжаем, так как пользователь уже создан
        }
        
        Toast.show({
          type: 'success',
          text1: 'Успех',
          text2: 'Регистрация прошла успешно. Пожалуйста, подтвердите вашу электронную почту.'
        });
        
        // Переходим на экран входа
        navigation.navigate(ROUTES.AUTH.LOGIN as never);
      }
      
    } catch (error: any) {
      console.error('Ошибка регистрации:', error.message);
      
      let errorMessage = 'Не удалось зарегистрироваться';
      
      if (error.message.includes('already registered')) {
        errorMessage = 'Этот email уже зарегистрирован';
      }
      
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icons.ArrowLeft size={24} color="#4b5563" />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>HARDCASE</Text>
          </View>
          
          <Text style={styles.title}>Регистрация</Text>
          <Text style={styles.subtitle}>
            Создайте новый аккаунт, чтобы начать
          </Text>
          
          <View style={styles.form}>
            {/* Тип пользователя */}
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'client' && styles.userTypeButtonActive
                ]}
                onPress={() => setUserType('client')}
              >
                <Text 
                  style={[
                    styles.userTypeText,
                    userType === 'client' && styles.userTypeTextActive
                  ]}
                >
                  Я клиент
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'trainer' && styles.userTypeButtonActive
                ]}
                onPress={() => setUserType('trainer')}
              >
                <Text 
                  style={[
                    styles.userTypeText,
                    userType === 'trainer' && styles.userTypeTextActive
                  ]}
                >
                  Я тренер
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Имя */}
            <View style={styles.inputContainer}>
              <Icons.User size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Имя"
                placeholderTextColor="#9ca3af"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            
            {/* Фамилия */}
            <View style={styles.inputContainer}>
              <Icons.Users size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Фамилия"
                placeholderTextColor="#9ca3af"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            
            {/* Email */}
            <View style={styles.inputContainer}>
              <Icons.Mail size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            
            {/* Пароль */}
            <View style={styles.inputContainer}>
              <Icons.Lock size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Пароль"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={toggleShowPassword}
                style={styles.inputRightIcon}
              >
                <Icons.Eye 
                  size={20} 
                  color="#6b7280" 
                  style={{ opacity: showPassword ? 1 : 0.5 }}
                />
              </TouchableOpacity>
            </View>
            
            {/* Подтверждение пароля */}
            <View style={styles.inputContainer}>
              <Icons.Lock size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Подтвердите пароль"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                onPress={toggleShowPassword}
                style={styles.inputRightIcon}
              >
                <Icons.Eye 
                  size={20} 
                  color="#6b7280" 
                  style={{ opacity: showPassword ? 1 : 0.5 }}
                />
              </TouchableOpacity>
            </View>
            
            {/* Кнопка регистрации */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
              )}
            </TouchableOpacity>
            
            {/* Уже есть аккаунт */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>
                Уже есть аккаунт?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.AUTH.LOGIN as never)}
              >
                <Text style={styles.loginLink}>Войти</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f97316',
    letterSpacing: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  userTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 16,
    padding: 4,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  userTypeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  userTypeTextActive: {
    color: '#f97316',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  inputRightIcon: {
    padding: 8,
  },
  registerButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
});

export default RegisterScreen; 