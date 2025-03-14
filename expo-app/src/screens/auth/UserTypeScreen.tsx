import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Icons from '@expo/vector-icons/Feather';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';
import { ROUTES } from '../../constants/routes';

const UserTypeScreen = () => {
  const [userType, setUserType] = useState<'client' | 'trainer' | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleSelectUserType = async (type: 'client' | 'trainer') => {
    try {
      setLoading(true);
      
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      // Обновляем metadata пользователя
      const { error: updateError } = await supabase.auth.updateUser({
        data: { user_type: type }
      });
      
      if (updateError) {
        throw updateError;
      }
      
      // Создаем запись в соответствующей таблице
      const tableName = type === 'client' ? 'clients' : 'trainers';
      const { error: profileError } = await supabase
        .from(tableName)
        .insert({
          user_id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || ''
        });
      
      if (profileError) {
        console.error(`Ошибка создания профиля ${type}:`, profileError.message);
        // Показываем ошибку, но продолжаем, так как metadata уже обновлена
        Toast.show({
          type: 'warning',
          text1: 'Предупреждение',
          text2: 'Тип пользователя установлен, но возникла ошибка при создании профиля'
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Успех',
          text2: 'Тип пользователя успешно установлен'
        });
      }
      
      // Обновляем локальный state
      setUserType(type);
      
      // Перезагружаем страницу для применения изменений
      window.location.reload();
      
    } catch (error: any) {
      console.error('Ошибка установки типа пользователя:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось установить тип пользователя'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>HARDCASE</Text>
        </View>
        
        <Text style={styles.title}>Выберите ваш тип аккаунта</Text>
        <Text style={styles.subtitle}>
          Выберите, как вы хотите использовать приложение
        </Text>
        
        <View style={styles.optionsContainer}>
          {/* Опция клиента */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              userType === 'client' && styles.optionCardActive
            ]}
            onPress={() => handleSelectUserType('client')}
            disabled={loading}
          >
            <View style={styles.optionIconContainer}>
              <Icons.User size={28} color="#f97316" />
            </View>
            <Text style={styles.optionTitle}>Клиент</Text>
            <Text style={styles.optionDescription}>
              Я хочу отслеживать свои тренировки и прогресс
            </Text>
          </TouchableOpacity>
          
          {/* Опция тренера */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              userType === 'trainer' && styles.optionCardActive
            ]}
            onPress={() => handleSelectUserType('trainer')}
            disabled={loading}
          >
            <View style={styles.optionIconContainer}>
              <Icons.Clipboard size={28} color="#f97316" />
            </View>
            <Text style={styles.optionTitle}>Тренер</Text>
            <Text style={styles.optionDescription}>
              Я хочу создавать тренировки и управлять клиентами
            </Text>
          </TouchableOpacity>
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Настройка аккаунта...</Text>
          </View>
        )}
      </View>
      
      {/* Логаут */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await supabase.auth.signOut();
        }}
      >
        <Icons.LogOut size={18} color="#6b7280" />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f97316',
    letterSpacing: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: '#f97316',
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logoutText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
});

export default UserTypeScreen; 