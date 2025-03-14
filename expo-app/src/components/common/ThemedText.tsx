import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'caption' | 'button' | 'label';

interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  centered?: boolean;
  bold?: boolean;
  italic?: boolean;
}

const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'body',
  color,
  centered = false,
  bold = false,
  italic = false,
  style,
  children,
  ...props
}) => {
  const { colors, isDarkMode } = useTheme();

  // Определяем базовые стили для разных вариантов текста
  const variantStyles = {
    h1: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 8,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 6,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '500',
      marginBottom: 2,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
    },
  };

  return (
    <Text
      style={[
        styles.defaultText,
        { color: color || colors.text },
        variantStyles[variant],
        centered && styles.centered,
        bold && styles.bold,
        italic && styles.italic,
        style, // Custom styles can override defaults
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    lineHeight: 24,
  },
  centered: {
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
});

export default ThemedText; 