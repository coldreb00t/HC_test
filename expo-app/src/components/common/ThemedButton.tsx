import React from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  TouchableOpacityProps, 
  ActivityIndicator, 
  View 
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ThemedText from './ThemedText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ThemedButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
}

const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  rounded = false,
  style,
  onPress,
  disabled,
  ...props
}) => {
  const { colors, isDarkMode } = useTheme();

  // Определяем стили для разных вариантов кнопок
  const getVariantStyle = (variant: ButtonVariant) => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          borderWidth: 1,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderColor: colors.secondary,
          borderWidth: 1,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
          borderWidth: 1,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: colors.error,
          borderColor: colors.error,
          borderWidth: 1,
        };
      default:
        return {};
    }
  };

  // Определяем цвет текста для разных вариантов
  const getTextColor = (variant: ButtonVariant) => {
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return colors.white;
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.primary;
      default:
        return colors.text;
    }
  };

  // Определяем размеры для разных типов кнопок
  const getSizeStyle = (size: ButtonSize) => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 6,
          paddingHorizontal: 12,
          minHeight: 36,
        };
      case 'medium':
        return {
          paddingVertical: 10,
          paddingHorizontal: 16,
          minHeight: 44,
        };
      case 'large':
        return {
          paddingVertical: 14,
          paddingHorizontal: 24,
          minHeight: 52,
        };
      default:
        return {};
    }
  };

  // Определяем размер текста для разных размеров кнопок
  const getTextVariant = (size: ButtonSize) => {
    switch (size) {
      case 'small':
        return 'caption';
      case 'medium':
        return 'button';
      case 'large':
        return 'subtitle';
      default:
        return 'button';
    }
  };

  const variantStyle = getVariantStyle(variant);
  const sizeStyle = getSizeStyle(size);
  const textColor = getTextColor(variant);
  const textVariant = getTextVariant(size);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyle,
        sizeStyle,
        fullWidth && styles.fullWidth,
        rounded && styles.rounded,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={textColor} 
            style={styles.loader} 
          />
        ) : (
          <>
            {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
            <ThemedText 
              variant={textVariant as any} 
              color={textColor} 
              centered 
              style={styles.text}
            >
              {title}
            </ThemedText>
            {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  rounded: {
    borderRadius: 50,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  loader: {
    marginHorizontal: 8,
  },
});

export default ThemedButton; 