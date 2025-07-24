
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useColorScheme, Appearance } from 'react-native';
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

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [manualTheme, setManualTheme] = useState<ThemeType>(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem('theme_preference');
        if (storedPreference) {
          const preference = JSON.parse(storedPreference) as ThemePreference;
          setManualTheme(preference.manualTheme);
        }
      } catch (e) {
        console.error('Error loading theme:', e);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    setManualTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme_preference', JSON.stringify({ manualTheme: newTheme }));
      Appearance.setColorScheme(newTheme);
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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
