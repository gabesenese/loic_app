
import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { useColorScheme, Appearance, InteractionManager, View, Image, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);


interface ThemePreference {
  manualTheme: ThemeType;
}

// Cache theme in memory
let cachedTheme: ThemeType | null = null;

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemTheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  // Always start with system theme to avoid flash
  const [manualTheme, setManualTheme] = useState<ThemeType>(systemTheme);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem('theme_preference');
        if (storedPreference) {
          const preference = JSON.parse(storedPreference) as ThemePreference;
          cachedTheme = preference.manualTheme;
          setManualTheme(preference.manualTheme);
        } else {
          cachedTheme = systemTheme;
        }
      } catch (e) {
        console.error('Error loading theme:', e);
        cachedTheme = systemTheme;
      } finally {
        setIsReady(true);
      }
    };
    
    loadTheme();
  }, [systemTheme]);

  const setTheme = async (newTheme: ThemeType) => {
    cachedTheme = newTheme;
    setManualTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme_preference', JSON.stringify({ manualTheme: newTheme }));
    } catch (e) {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(manualTheme === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(() => ({
    theme: manualTheme,
    setTheme,
    toggleTheme
  }), [manualTheme]);

  if (!isReady) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
