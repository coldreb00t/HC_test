import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Icons from '@expo/vector-icons/Feather';

// Импорт экранов
import ClientHomeScreen from '../screens/ClientHomeScreen';
import ClientProfileScreen from '../screens/ClientProfileScreen';
import ClientWorkoutsScreen from '../screens/ClientWorkoutsScreen';
import WorkoutDetailsScreen from '../screens/WorkoutDetailsScreen';
import ExerciseDetailsScreen from '../screens/ExerciseDetailsScreen'; 
import ClientEditProfileScreen from '../screens/ClientEditProfileScreen';

// Импорт констант
import { ROUTES } from '../constants/routes';

// Создаем навигаторы
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Навигация вкладок
const ClientTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: React.ComponentProps<typeof Icons.Home>["name"] = "home";

          if (route.name === ROUTES.CLIENT.HOME) {
            iconName = "home";
          } else if (route.name === ROUTES.CLIENT.WORKOUTS) {
            iconName = "calendar";
          } else if (route.name === ROUTES.CLIENT.PROFILE) {
            iconName = "user";
          }

          // @ts-ignore - игнорирование типа иконки
          return <Icons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#f97316",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen 
        name={ROUTES.CLIENT.HOME} 
        component={ClientHomeScreen} 
        options={{ tabBarLabel: "Главная" }}
      />
      <Tab.Screen 
        name={ROUTES.CLIENT.WORKOUTS} 
        component={ClientWorkoutsScreen} 
        options={{ tabBarLabel: "Тренировки" }}
      />
      <Tab.Screen 
        name={ROUTES.CLIENT.PROFILE} 
        component={ClientProfileScreen} 
        options={{ tabBarLabel: "Профиль" }}
      />
    </Tab.Navigator>
  );
};

// Основной стек навигации для клиентов
const ClientStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name={ROUTES.CLIENT.MAIN_TAB} 
        component={ClientTabs} 
      />
      <Stack.Screen 
        name={ROUTES.CLIENT.WORKOUT_DETAILS} 
        component={WorkoutDetailsScreen} 
      />
      <Stack.Screen 
        name={ROUTES.CLIENT.EXERCISE_DETAILS} 
        component={ExerciseDetailsScreen} 
      />
      <Stack.Screen 
        name={ROUTES.CLIENT.EDIT_PROFILE} 
        component={ClientEditProfileScreen} 
      />
    </Stack.Navigator>
  );
};

export default ClientStack; 