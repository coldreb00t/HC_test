import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ROUTES } from '../constants/routes';
import { TrainerParamList } from '../types/navigation.types';

// Импорт экранов тренера
import TrainerDashboardScreen from '../screens/trainer/TrainerDashboardScreen';
import TrainerClientsScreen from '../screens/trainer/TrainerClientsScreen';
import TrainerWorkoutsScreen from '../screens/trainer/TrainerWorkoutsScreen';
import ClientDetailsScreen from '../screens/trainer/ClientDetailsScreen';
import CreateWorkoutScreen from '../screens/trainer/CreateWorkoutScreen';
import WorkoutDetailsScreen from '../screens/common/WorkoutDetailsScreen';

// Создание навигатора стека
const Stack = createStackNavigator<TrainerParamList>();

/**
 * Навигационный стек для тренера
 * Включает все экраны, доступные тренеру после авторизации
 */
const TrainerStack = () => {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.TRAINER_DASHBOARD}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' },
        presentation: 'card',
        gestureEnabled: true,
        animationEnabled: true,
      }}
    >
      {/* Основные экраны тренера */}
      <Stack.Screen 
        name={ROUTES.TRAINER_DASHBOARD} 
        component={TrainerDashboardScreen} 
      />
      <Stack.Screen 
        name={ROUTES.TRAINER_CLIENTS} 
        component={TrainerClientsScreen} 
      />
      <Stack.Screen 
        name={ROUTES.TRAINER_WORKOUTS} 
        component={TrainerWorkoutsScreen} 
      />
      
      {/* Экраны для работы с клиентами */}
      <Stack.Screen 
        name={ROUTES.CLIENT_DETAILS} 
        component={ClientDetailsScreen} 
        options={{
          headerShown: true,
          headerTitle: 'Детали клиента',
          headerBackTitleVisible: false,
        }}
      />
      
      {/* Экраны для работы с тренировками */}
      <Stack.Screen 
        name={ROUTES.CREATE_WORKOUT} 
        component={CreateWorkoutScreen} 
        options={{
          headerShown: true,
          headerTitle: 'Создание тренировки',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name={ROUTES.WORKOUT_DETAILS} 
        component={WorkoutDetailsScreen} 
        options={{
          headerShown: true,
          headerTitle: 'Детали тренировки',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default TrainerStack; 