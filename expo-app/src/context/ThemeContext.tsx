import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, lightColors, darkColors } from '../styles/theme';

// Ключ для хранения предпочтений темы
const THEME_PREFERENCE_KEY = '@hardcase_theme_preference';

// Типы тем
export type ThemeType = 'light' | 'dark' | 'system';

// Интерфейс контекста темы
export interface ThemeContextType {
  theme: ThemeType;
  isDarkMode: boolean;
  colors: typeof lightColors;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

// Создание контекста темы
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  isDarkMode: false,
  colors: lightColors,
  setTheme: () => {},
  toggleTheme: () => {},
});

// Свойства для провайдера темы
interface ThemeProviderProps {
  children: ReactNode;
}

// Провайдер темы
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Получаем предпочтения системы
  const systemColorScheme = useColorScheme();
  
  // Состояние для хранения выбранной темы
  const [theme, setThemeState] = useState<ThemeType>('system');
  
  // Определяем, используется ли темная тема
  const isDarkMode = 
    theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  
  // Определяем цветовую схему на основе выбранной темы
  const colors = isDarkMode ? darkColors : lightColors;

  // Загружаем сохраненные предпочтения при монтировании
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedTheme) {
          setThemeState(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Ошибка при загрузке предпочтений темы:', error);
      }
    };
    
    loadThemePreference();
  }, []);

  // Функция для установки темы
  const setTheme = async (newTheme: ThemeType) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, newTheme);
    } catch (error) {
      console.error('Ошибка при сохранении предпочтений темы:', error);
    }
  };

  // Функция для переключения между светлой и темной темой
  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode,
        colors,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Хук для использования контекста темы
export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider; 