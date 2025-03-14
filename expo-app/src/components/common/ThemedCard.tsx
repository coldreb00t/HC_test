import React from 'react';
import { View, StyleSheet, ViewProps, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ThemedText from './ThemedText';

export type CardVariant = 'default' | 'outlined' | 'elevated';

interface ThemedCardProps extends ViewProps {
  title?: string;
  subtitle?: string;
  variant?: CardVariant;
  onPress?: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  fullWidth?: boolean;
  padding?: number;
}

const ThemedCard: React.FC<ThemedCardProps> = ({
  title,
  subtitle,
  variant = 'default',
  onPress,
  children,
  footer,
  style,
  fullWidth = false,
  padding = 16,
  ...props
}) => {
  const { colors, isDarkMode } = useTheme();

  // Определяем стили для разных вариантов карточек
  const getVariantStyle = (variant: CardVariant) => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: colors.card,
          borderWidth: 0,
        };
      case 'outlined':
        return {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'elevated':
        return {
          backgroundColor: colors.card,
          borderWidth: 0,
          ...styles.shadowProps,
          shadowColor: isDarkMode ? colors.black : colors.shadow,
        };
      default:
        return {};
    }
  };

  const cardContent = (
    <View
      style={[
        styles.card,
        getVariantStyle(variant),
        fullWidth && styles.fullWidth,
        { padding },
        style,
      ]}
      {...props}
    >
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <ThemedText variant="subtitle">{title}</ThemedText>}
          {subtitle && (
            <ThemedText variant="caption" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      )}
      
      <View style={styles.content}>{children}</View>
      
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shadowProps: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fullWidth: {
    width: '100%',
  },
  header: {
    marginBottom: 12,
  },
  subtitle: {
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
});

export default ThemedCard; 