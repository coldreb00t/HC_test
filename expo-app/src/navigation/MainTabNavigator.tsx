import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

// Экраны для клиентов
import ClientWorkoutsScreen from '../screens/client/ClientWorkoutsScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';
import ClientProgressScreen from '../screens/client/ClientProgressScreen';

// Экраны для тренеров
import TrainerClientsScreen from '../screens/trainer/TrainerClientsScreen';
import TrainerWorkoutsScreen from '../screens/trainer/TrainerWorkoutsScreen';
import TrainerProfileScreen from '../screens/trainer/TrainerProfileScreen';

// Общие экраны
import ExercisesScreen from '../screens/common/ExercisesScreen';

// Типы для навигации
export type MainTabParamList = {
  // Вкладки клиента
  ClientWorkouts: undefined;
  ClientProgress: undefined;
  Exercises: undefined;
  ClientProfile: undefined;
  
  // Вкладки тренера
  TrainerClients: undefined;
  TrainerWorkouts: undefined;
  TrainerProfile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Временная заглушка для определения роли пользователя
// В реальном приложении это должно быть получено из Supabase
const userRole = 'client'; // или 'trainer'

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';

          if (route.name === 'ClientWorkouts' || route.name === 'TrainerWorkouts') {
            iconName = 'calendar';
          } else if (route.name === 'ClientProgress') {
            iconName = 'trending-up';
          } else if (route.name === 'Exercises') {
            iconName = 'activity';
          } else if (route.name === 'ClientProfile' || route.name === 'TrainerProfile') {
            iconName = 'user';
          } else if (route.name === 'TrainerClients') {
            iconName = 'users';
          }

          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4361ee',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      {userRole === 'client' ? (
        // Вкладки для клиента
        <>
          <Tab.Screen 
            name="ClientWorkouts" 
            component={ClientWorkoutsScreen} 
            options={{ title: 'Тренировки' }}
          />
          <Tab.Screen 
            name="ClientProgress" 
            component={ClientProgressScreen} 
            options={{ title: 'Прогресс' }}
          />
          <Tab.Screen 
            name="Exercises" 
            component={ExercisesScreen} 
            options={{ title: 'Упражнения' }}
          />
          <Tab.Screen 
            name="ClientProfile" 
            component={ClientProfileScreen} 
            options={{ title: 'Профиль' }}
          />
        </>
      ) : (
        // Вкладки для тренера
        <>
          <Tab.Screen 
            name="TrainerClients" 
            component={TrainerClientsScreen} 
            options={{ title: 'Клиенты' }}
          />
          <Tab.Screen 
            name="TrainerWorkouts" 
            component={TrainerWorkoutsScreen} 
            options={{ title: 'Тренировки' }}
          />
          <Tab.Screen 
            name="Exercises" 
            component={ExercisesScreen} 
            options={{ title: 'Упражнения' }}
          />
          <Tab.Screen 
            name="TrainerProfile" 
            component={TrainerProfileScreen} 
            options={{ title: 'Профиль' }}
          />
        </>
      )}
    </Tab.Navigator>
  );
} 