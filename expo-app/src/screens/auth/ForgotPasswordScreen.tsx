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
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';
import { ROUTES } from '../../constants/routes';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const handleResetPassword = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Пожалуйста, введите ваш email'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'expo://reset-password',
      });
      
      if (error) {
        throw error;
      }
      
      setEmailSent(true);
      
      Toast.show({
        type: 'success',
        text1: 'Успех',
        text2: 'Инструкции по сбросу пароля отправлены на ваш email'
      });
      
    } catch (error: any) {
      console.error('Ошибка сброса пароля:', error.message);
      
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось отправить инструкции по сбросу пароля'
      });
    } finally {
      setLoading(false);
    }
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
            <Feather name="arrow-left" size={24} color="#4b5563" />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>HARDCASE</Text>
            </View>
          </View>
          
          <Text style={styles.title}>Восстановление пароля</Text>
          <Text style={styles.subtitle}>
            {emailSent 
              ? 'Мы отправили инструкции по сбросу пароля на указанный email. Пожалуйста, проверьте вашу почту.' 
              : 'Введите ваш email, и мы отправим вам инструкции по сбросу пароля.'
            }
          </Text>
          
          <View style={styles.form}>
            {/* Email поле */}
            {!emailSent && (
              <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color="#6b7280" style={styles.inputIcon} />
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
            )}
            
            {/* Кнопка для сброса пароля */}
            {!emailSent ? (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.resetButtonText}>Сбросить пароль</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => navigation.navigate(ROUTES.AUTH.LOGIN as never)}
              >
                <Text style={styles.backToLoginButtonText}>Вернуться к входу</Text>
              </TouchableOpacity>
            )}
            
            {/* Помощь */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                Не получили письмо?{' '}
              </Text>
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={loading || !emailSent}
              >
                <Text 
                  style={[
                    styles.helpLink,
                    (loading || !emailSent) && { opacity: 0.5 }
                  ]}
                >
                  Отправить повторно
                </Text>
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
    justifyContent: 'center',
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
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
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
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  resetButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToLoginButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backToLoginButtonText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
  },
  helpLink: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen; 