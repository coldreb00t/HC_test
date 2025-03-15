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
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';

const UserTypeScreen = () => {
  const [loading, setLoading] = useState(false);
  const { setUserType } = useAuth();
  const navigation = useNavigation();
  
  const handleSelectUserType = async (type: 'client' | 'trainer') => {
    try {
      setLoading(true);
      
      // Используем функцию из AuthContext для установки типа пользователя
      await setUserType(type);
      
      Toast.show({
        type: 'success',
        text1: 'Успех',
        text2: 'Тип пользователя успешно установлен'
      });
      
      // Навигация будет выполнена автоматически в AuthContext через изменение userType
      
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
            source={require('../../../assets/icon.png')}
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
          <TouchableOpacity
            style={[styles.option, styles.optionClient]}
            onPress={() => handleSelectUserType('client')}
            disabled={loading}
          >
            <Feather name="user" size={48} color="#4361ee" />
            <Text style={styles.optionTitle}>Клиент</Text>
            <Text style={styles.optionDescription}>
              Получайте персональные тренировки от вашего тренера
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.option, styles.optionTrainer]}
            onPress={() => handleSelectUserType('trainer')}
            disabled={loading}
          >
            <Feather name="clipboard" size={48} color="#4361ee" />
            <Text style={styles.optionTitle}>Тренер</Text>
            <Text style={styles.optionDescription}>
              Создавайте и отслеживайте программы тренировок для ваших клиентов
            </Text>
          </TouchableOpacity>
        </View>
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4361ee" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4361ee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'column',
    gap: 20,
  },
  option: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  optionClient: {
    borderColor: '#4361ee',
    backgroundColor: 'rgba(67, 97, 238, 0.05)',
  },
  optionTrainer: {
    borderColor: '#4361ee',
    backgroundColor: 'rgba(67, 97, 238, 0.05)',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  optionDescription: {
    textAlign: 'center',
    color: '#6b7280',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserTypeScreen; 