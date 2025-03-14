import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import AppNavigation from './src/navigation/AppNavigation';
import { LogBox } from 'react-native';

// Игнорирование неважных предупреждений, которые не влияют на функциональность
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
  'Non-serializable values were found in the navigation state.',
]);

export default function App() {
  // Настройка статус-бара
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <AppNavigation />
  );
} 