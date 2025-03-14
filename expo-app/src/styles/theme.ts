import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Типы для цветовой схемы
export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
  placeholder: string;
  disabled: string;
  white: string;
  black: string;
  transparent: string;
  overlay: string;
};

// Цветовая схема для светлой темы
export const lightColors: ThemeColors = {
  primary: '#4361ee',
  primaryDark: '#3046c6',
  primaryLight: '#6988ff',
  secondary: '#2b2d42',
  secondaryDark: '#1c1e2a',
  secondaryLight: '#4a4c67',
  success: '#28a745',
  danger: '#ef4444',
  warning: '#eab308',
  info: '#0ea5e9',
  background: '#f8f9fa',
  card: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  shadow: 'rgba(0, 0, 0, 0.1)',
  placeholder: '#9ca3af',
  disabled: '#d1d5db',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Цветовая схема для темной темы
export const darkColors: ThemeColors = {
  primary: '#5d76ff',
  primaryDark: '#3046c6',
  primaryLight: '#8a9dff',
  secondary: '#374151',
  secondaryDark: '#1f2937',
  secondaryLight: '#4b5563',
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',
  info: '#38bdf8',
  background: '#111827',
  card: '#1f2937',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  border: '#374151',
  shadow: 'rgba(0, 0, 0, 0.3)',
  placeholder: '#6b7280',
  disabled: '#4b5563',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

// Типы для размеров
export type ThemeSizes = {
  base: number;
  radius: number;
  padding: number;
  margin: number;
  width: number;
  height: number;
  isSmallDevice: boolean;
};

// Размеры для интерфейса
export const sizes: ThemeSizes = {
  base: 8,
  radius: 8,
  padding: 16,
  margin: 16,
  width,
  height,
  isSmallDevice: width < 375,
};

// Типы для типографики
export type ThemeTypography = {
  fontFamily: {
    regular: string;
    medium: string;
    semiBold: string;
    bold: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
  lineHeight: {
    xs: number;
    sm: number;
    base: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
};

// Типографика
export const typography: ThemeTypography = {
  fontFamily: {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    semiBold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
    '4xl': 48,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    md: 28,
    lg: 28,
    xl: 32,
    '2xl': 38,
    '3xl': 44,
    '4xl': 56,
  },
};

// Тени для компонентов
export const shadows = {
  sm: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 1,
  },
  md: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  lg: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.5,
    elevation: 6,
  },
  xl: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 6.5,
    elevation: 9,
  },
};

// Z-индексы для слоев интерфейса
export const zIndices = {
  base: 1,
  drawer: 40,
  modal: 50,
  overlay: 80,
  toast: 90,
  popover: 100,
};

// Полная тема
export const Theme = {
  colors: lightColors,
  darkColors,
  sizes,
  typography,
  shadows,
  zIndices,
};

export type Theme = typeof Theme;

export default Theme; 