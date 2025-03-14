import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { StackNavigationProp } from '@react-navigation/stack';

import { supabase } from '../../lib/supabase';
import { Client } from '../../types/models';
import { TrainerStackParamList } from '../../types/navigation.types';

type TrainerClientsScreenNavigationProp = StackNavigationProp<TrainerStackParamList, 'TrainerTabs'>;

const TrainerClientsScreen = () => {
  const navigation = useNavigation<TrainerClientsScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [trainerId, setTrainerId] = useState<string | null>(null);

  // Функция для получения всех клиентов тренера
  const fetchClients = useCallback(async () => {
    try {
      if (!trainerId) {
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
          .order('first_name', { ascending: true });

        if (clientsError) {
          throw new Error('Ошибка при получении списка клиентов');
        }

        setClients(clientsData || []);
        setFilteredClients(clientsData || []);
      } else {
        // Получаем список клиентов для уже известного trainerId
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('trainer_id', trainerId)
          .order('first_name', { ascending: true });

        if (clientsError) {
          throw new Error('Ошибка при получении списка клиентов');
        }

        setClients(clientsData || []);
        setFilteredClients(clientsData || []);
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке клиентов:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка загрузки',
        text2: error.message || 'Не удалось загрузить список клиентов',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trainerId]);

  // Загружаем данные при монтировании компонента и при фокусе экрана
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [fetchClients])
  );

  // Обработчик для обновления при свайпе вниз
  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  // Функция для фильтрации клиентов
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredClients(clients);
    } else {
      const query = text.toLowerCase();
      const filtered = clients.filter((client: Client) => 
        client.first_name.toLowerCase().includes(query) ||
        client.last_name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        (client.phone && client.phone.includes(query))
      );
      setFilteredClients(filtered);
    }
  };

  // Функция для перехода на экран создания нового клиента
  const handleAddClient = () => {
    // Здесь можно добавить навигацию на экран создания клиента
    // Пока просто покажем алерт с информацией
    Alert.alert(
      'Добавление клиента',
      'Функционал добавления нового клиента будет реализован позже.',
      [{ text: 'OK' }]
    );
  };

  // Функция для отображения инициалов клиента
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Рендер элемента клиента
  const renderClientItem = ({ item }: { item: Client }) => {
    return (
      <TouchableOpacity 
        style={styles.clientCard}
        onPress={() => navigation.navigate('ClientDetails', { clientId: item.id })}
      >
        <View style={styles.avatarContainer}>
          {item.profile_image_url ? (
            <Image 
              source={{ uri: item.profile_image_url }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.initialsContainer}>
              <Text style={styles.initialsText}>
                {getInitials(item.first_name, item.last_name)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.first_name} {item.last_name}</Text>
          <Text style={styles.clientDetail}>{item.email}</Text>
          {item.phone && <Text style={styles.clientDetail}>{item.phone}</Text>}
        </View>
        
        <Feather name="chevron-right" size={20} color="#6b7280" />
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мои клиенты</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddClient}
        >
          <Feather name="user-plus" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по имени, email или телефону"
            value={searchQuery}
            onChangeText={handleSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          {searchQuery.trim() !== '' ? (
            <>
              <Feather name="search" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>Ничего не найдено</Text>
              <Text style={styles.emptyText}>
                Попробуйте изменить параметры поиска
              </Text>
            </>
          ) : (
            <>
              <Feather name="users" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>У вас пока нет клиентов</Text>
              <Text style={styles.emptyText}>
                Нажмите на кнопку "+" в правом верхнем углу, чтобы добавить клиента
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderClientItem}
          keyExtractor={(item: Client) => item.id.toString()}
          contentContainerStyle={styles.clientsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4361ee"]}
              tintColor="#4361ee"
            />
          }
        />
      )}
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
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#4361ee',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
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
  clientsList: {
    padding: 16,
  },
  clientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  initialsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4361ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TrainerClientsScreen; 