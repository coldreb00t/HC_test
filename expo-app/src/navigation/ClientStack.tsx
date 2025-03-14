import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';

// Импорт экранов
import ClientWorkoutsScreen from '../screens/client/ClientWorkoutsScreen';
import WorkoutDetailsScreen from '../screens/workout/WorkoutDetailsScreen';
import ExerciseDetailsScreen from '../screens/exercise/ExerciseDetailsScreen';
import ExerciseListScreen from '../screens/exercise/ExerciseListScreen';
import ClientProgressScreen from '../screens/client/ClientProgressScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';
import AddProgressScreen from '../screens/client/AddProgressScreen';

// Импорт типов и констант
import { ClientStackParamList, ClientTabParamList } from '../types/navigation.types';
import { ROUTES } from '../constants/routes';

// Создание навигаторов
const Tab = createBottomTabNavigator<ClientTabParamList>();
const Stack = createStackNavigator<ClientStackParamList>();

// Навигатор вкладок для клиента
const ClientTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';

          if (route.name === ROUTES.CLIENT.TABS.WORKOUTS) {
            iconName = 'activity';
          } else if (route.name === ROUTES.CLIENT.TABS.PROGRESS) {
            iconName = 'bar-chart-2';
          } else if (route.name === ROUTES.CLIENT.TABS.EXERCISES) {
            iconName = 'list';
          } else if (route.name === ROUTES.CLIENT.TABS.PROFILE) {
            iconName = 'user';
          }

          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4361ee',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen 
        name={ROUTES.CLIENT.TABS.WORKOUTS} 
        component={ClientWorkoutsScreen}
        options={{ title: 'Тренировки' }}
      />
      <Tab.Screen 
        name={ROUTES.CLIENT.TABS.PROGRESS} 
        component={ClientProgressScreen}
        options={{ title: 'Прогресс' }}
      />
      <Tab.Screen 
        name={ROUTES.CLIENT.TABS.EXERCISES} 
        component={ExerciseListScreen}
        options={{ title: 'Упражнения' }}
      />
      <Tab.Screen 
        name={ROUTES.CLIENT.TABS.PROFILE} 
        component={ClientProfileScreen}
        options={{ title: 'Профиль' }}
      />
    </Tab.Navigator>
  );
};

// Основной стек навигации для клиента
const ClientStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="WorkoutDetails" component={WorkoutDetailsScreen} />
      <Stack.Screen name="ExerciseDetails" component={ExerciseDetailsScreen} />
      <Stack.Screen name="AddProgress" component={AddProgressScreen} />
    </Stack.Navigator>
  );
};

export default ClientStack; 