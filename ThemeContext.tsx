import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [theme, _setTheme] = useState<ThemeType>(systemScheme === 'dark' ? 'dark' : 'light');

  // Load theme from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('theme_preference');
        if (storedTheme === 'dark' || storedTheme === 'light') {
          _setTheme(storedTheme);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const setTheme = async (t: any) => {
    if (t === 'dark' || t === 'light') {
      _setTheme(t);
      try {
        await AsyncStorage.setItem('theme_preference', t);
      } catch (e) {
        // ignore
      }
    }
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}; 