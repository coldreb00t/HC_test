import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons/Feather';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { ROUTES } from '../constants/routes';

interface ClientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  user_id: string;
  trainer_id?: string;
  avatar_url?: string;
  created_at: string;
}

interface Statistics {
  totalWorkouts: number;
  completedWorkouts: number;
  canceledWorkouts: number;
  upcomingWorkouts: number;
}

const ClientProfileScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Statistics>({
    totalWorkouts: 0,
    completedWorkouts: 0,
    canceledWorkouts: 0,
    upcomingWorkouts: 0
  });

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
      
      setProfile(data);
      
      // Загружаем статистику
      await fetchStatistics(data.id);
      
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
  
  const fetchStatistics = async (clientId: string) => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Получаем все тренировки клиента
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId);
      
      if (error) {
        throw error;
      }
      
      const workouts = data || [];
      
      // Подсчитываем статистику
      const statistics = {
        totalWorkouts: workouts.length,
        completedWorkouts: workouts.filter(workout => workout.status === 'completed').length,
        canceledWorkouts: workouts.filter(workout => workout.status === 'canceled').length,
        upcomingWorkouts: workouts.filter(workout => new Date(workout.date) > new Date(currentDate)).length
      };
      
      setStats(statistics);
      
    } catch (error: any) {
      console.error('Ошибка при загрузке статистики:', error.message);
    }
  };
  
  const handleLogout = async () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              
              if (error) {
                throw error;
              }
              
              // Переходим на экран авторизации
              navigation.reset({
                index: 0,
                routes: [{ name: ROUTES.AUTH.LOGIN as never }]
              });
              
            } catch (error: any) {
              console.error('Ошибка при выходе:', error.message);
              Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: 'Не удалось выйти из аккаунта'
              });
            }
          }
        }
      ]
    );
  };
  
  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Заголовок */}
        <View style={styles.header}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Text style={styles.placeholderText}>
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.first_name} {profile?.last_name}
              </Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
              {profile?.phone && (
                <Text style={styles.profilePhone}>{profile?.phone}</Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate(ROUTES.CLIENT.EDIT_PROFILE as never)}
          >
            <Icons.Edit size={18} color="#ffffff" />
            <Text style={styles.editButtonText}>Изменить</Text>
          </TouchableOpacity>
        </View>
        
        {/* Статистика */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Моя статистика</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>Всего тренировок</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.completedWorkouts}</Text>
              <Text style={styles.statLabel}>Завершено</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.upcomingWorkouts}</Text>
              <Text style={styles.statLabel}>Предстоит</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.canceledWorkouts}</Text>
              <Text style={styles.statLabel}>Отменено</Text>
            </View>
          </View>
        </View>
        
        {/* Информация об аккаунте */}
        <View style={styles.accountInfoContainer}>
          <Text style={styles.sectionTitle}>Информация об аккаунте</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID клиента</Text>
              <Text style={styles.infoValue}>{profile?.id}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Дата регистрации</Text>
              <Text style={styles.infoValue}>
                {profile?.created_at ? formatDate(profile.created_at) : 'Н/Д'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Кнопка выхода */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Icons.LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
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
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholderAvatar: {
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  editButton: {
    backgroundColor: '#f97316',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    marginLeft: 8,
  },
  statsContainer: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f97316',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  accountInfoContainer: {
    margin: 16,
    marginTop: 0,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 8,
  },
});

export default ClientProfileScreen; 