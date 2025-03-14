import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Animated, Easing, StyleSheet } from 'react-native';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import UserTypeScreen from '../screens/auth/UserTypeScreen';
import { ROUTES } from '../constants/routes';
import { AuthStackParamList } from '../types/navigation.types';

const Stack = createStackNavigator<AuthStackParamList>();

// Конфигурация анимаций для стека авторизации
const slideFromRight = {
  cardStyleInterpolator: ({ current, layouts }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
    };
  },
  headerStyleInterpolator: ({ current, layouts }: any) => {
    return {
      headerStyle: {
        opacity: current.progress,
      },
    };
  },
};

const fadeIn = {
  cardStyleInterpolator: ({ current }: any) => {
    return {
      cardStyle: {
        opacity: current.progress,
      },
    };
  },
};

const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.AUTH.LOGIN}
      screenOptions={{
        headerShown: false,
        cardStyle: styles.cardStyle,
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
              easing: Easing.out(Easing.poly(4)),
              useNativeDriver: true,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 250,
              easing: Easing.out(Easing.poly(4)),
              useNativeDriver: true,
            },
          },
        },
        ...slideFromRight,
      }}
    >
      <Stack.Screen 
        name={ROUTES.AUTH.LOGIN} 
        component={LoginScreen} 
      />
      <Stack.Screen 
        name={ROUTES.AUTH.REGISTER} 
        component={RegisterScreen} 
      />
      <Stack.Screen 
        name={ROUTES.AUTH.FORGOT_PASSWORD} 
        component={ForgotPasswordScreen} 
        options={{
          ...fadeIn,
        }}
      />
      <Stack.Screen 
        name={ROUTES.AUTH.USER_TYPE} 
        component={UserTypeScreen} 
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  cardStyle: {
    backgroundColor: '#f8f9fa',
  },
});

export default AuthStack; 