import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ThemedText from './ThemedText';

interface ThemedLoaderProps extends ViewProps {
  size?: 'small' | 'large';
  text?: string;
  fullscreen?: boolean;
  transparent?: boolean;
}

const ThemedLoader: React.FC<ThemedLoaderProps> = ({
  size = 'large',
  text,
  style,
  fullscreen = false,
  transparent = false,
  ...props
}) => {
  const { colors } = useTheme();

  if (fullscreen) {
    return (
      <View 
        style={[
          styles.fullscreenContainer, 
          transparent && styles.transparent,
          { backgroundColor: transparent ? 'rgba(0,0,0,0.3)' : colors.background },
          style
        ]}
        {...props}
      >
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size={size} color={colors.primary} style={styles.indicator} />
          {text && <ThemedText variant="caption" style={styles.text}>{text}</ThemedText>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} {...props}>
      <ActivityIndicator size={size} color={colors.primary} style={styles.indicator} />
      {text && <ThemedText variant="caption" style={styles.text}>{text}</ThemedText>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  transparent: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loaderWrapper: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    backgroundColor: 'white',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  indicator: {
    marginBottom: 8,
  },
  text: {
    textAlign: 'center',
  },
});

export default ThemedLoader; 