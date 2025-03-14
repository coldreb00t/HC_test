import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// Компоненты с поддержкой темы
import ThemedContainer from '../../components/common/ThemedContainer';
import ThemedText from '../../components/common/ThemedText';
import ThemedInput from '../../components/common/ThemedInput';
import ThemedButton from '../../components/common/ThemedButton';
import ThemedLoader from '../../components/common/ThemedLoader';

// Компонент для визуализации поля ввода
const InputField = ({ 
  label, 
  icon, 
  error, 
  isPassword = false, 
  ...props 
}: any) => {
  const { colors } = useTheme();
  
  return (
    <ThemedInput
      label={label}
      error={error}
      isPassword={isPassword}
      leftIcon={
        <Ionicons 
          name={icon} 
          size={20} 
          color={error ? colors.error : colors.textSecondary} 
        />
      }
      fullWidth
      {...props}
    />
  );
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const { signIn } = useAuth();
  const { colors, isDarkMode } = useTheme();

  // Состояния
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Валидация формы
  const validateForm = () => {
    Keyboard.dismiss();
    const newErrors: Record<string, string> = {};

    // Проверка email
    if (!email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Укажите корректный email';
    }

    // Проверка пароля
    if (!password) {
      newErrors.password = 'Пароль обязателен';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработка входа
  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      if ('error' in result) {
        // Обработка ошибок аутентификации
        if (result.error.message.includes('Invalid login')) {
          setErrors({ password: 'Неверный email или пароль' });
        } else {
          setErrors({ form: result.error.message });
        }
      }
    } catch (error: any) {
      setErrors({ form: error.message || 'Произошла ошибка при входе' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Навигация на экран регистрации
  const goToSignUp = () => {
    navigation.navigate(ROUTES.AUTH.REGISTER as never);
  };

  // Навигация на экран восстановления пароля
  const goToForgotPassword = () => {
    navigation.navigate(ROUTES.AUTH.FORGOT_PASSWORD as never);
  };

  return (
    <ThemedContainer 
      withScroll 
      withKeyboardAvoid
      style={styles.container}
    >
      {isSubmitting && <ThemedLoader fullscreen text="Выполняется вход..." />}

      <View style={styles.header}>
        <Image 
          source={
            isDarkMode 
              ? require('../../../assets/images/logo-dark.png') 
              : require('../../../assets/images/logo-light.png')
          } 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <ThemedText variant="h1" centered style={styles.title}>
          HARDCASE
        </ThemedText>
        <ThemedText variant="subtitle" centered color={colors.textSecondary}>
          Войдите в свой аккаунт
        </ThemedText>
      </View>

      <View style={styles.formContainer}>
        {errors.form ? (
          <View style={[styles.errorContainer, { backgroundColor: `${colors.error}15` }]}>
            <ThemedText variant="caption" color={colors.error}>
              {errors.form}
            </ThemedText>
          </View>
        ) : null}

        <InputField
          label="Email"
          placeholder="Введите ваш email"
          icon="mail-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
        />

        <InputField
          label="Пароль"
          placeholder="Введите ваш пароль"
          icon="lock-closed-outline"
          isPassword
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <TouchableOpacity 
          onPress={goToForgotPassword} 
          style={styles.forgotPassword}
        >
          <ThemedText 
            variant="caption" 
            color={colors.primary}
          >
            Забыли пароль?
          </ThemedText>
        </TouchableOpacity>

        <ThemedButton
          title="Войти"
          onPress={handleLogin}
          fullWidth
          style={styles.loginButton}
        />

        <View style={styles.signupContainer}>
          <ThemedText variant="body" color={colors.textSecondary}>
            Нет аккаунта?
          </ThemedText>
          <TouchableOpacity onPress={goToSignUp}>
            <ThemedText 
              variant="body" 
              color={colors.primary} 
              style={styles.signupText}
            >
              Зарегистрироваться
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  loginButton: {
    marginTop: 16,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    marginLeft: 5,
    fontWeight: '600',
  },
});

export default LoginScreen; 