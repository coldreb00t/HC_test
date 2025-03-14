import React from 'react';
import { 
  View, 
  StyleSheet, 
  ViewProps, 
  SafeAreaView, 
  StatusBar, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  RefreshControl
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ThemedText from './ThemedText';

interface ThemedContainerProps extends ViewProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  withScroll?: boolean;
  withKeyboardAvoid?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: any;
  removeSafeArea?: boolean;
  headerRight?: React.ReactNode;
}

const ThemedContainer: React.FC<ThemedContainerProps> = ({
  children,
  title,
  subtitle,
  style,
  withScroll = false,
  withKeyboardAvoid = true,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  removeSafeArea = false,
  headerRight,
  ...props
}) => {
  const { colors, isDarkMode } = useTheme();

  const Container = removeSafeArea ? View : SafeAreaView;

  // Основной контент для рендера
  const renderContent = () => {
    let content = <View style={[styles.content, contentContainerStyle]}>{children}</View>;

    // Оборачиваем контент в ScrollView, если требуется
    if (withScroll) {
      content = (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      );
    }

    // Оборачиваем контент в KeyboardAvoidingView, если требуется
    if (withKeyboardAvoid) {
      return (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          {content}
        </KeyboardAvoidingView>
      );
    }

    return content;
  };

  return (
    <Container
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
        style,
      ]}
      {...props}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        animated
      />

      {(title || subtitle || headerRight) && (
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            {title && <ThemedText variant="h2">{title}</ThemedText>}
            {subtitle && (
              <ThemedText variant="caption" style={styles.subtitle}>
                {subtitle}
              </ThemedText>
            )}
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}

      {renderContent()}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
  },
  headerRight: {
    marginLeft: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
});

export default ThemedContainer; 