'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile } = useAuth();
  const [theme, setThemeState] = useState<Theme>('dark'); // Default to dark

  // 1. Initial Load from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme);
    } else {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setThemeState(systemTheme);
    }
  }, []);

  // 2. Sync with profile when logged in
  useEffect(() => {
    if (profile?.theme === 'light' || profile?.theme === 'dark') {
      setThemeState(profile.theme as Theme);
    }
  }, [profile]);

  // 3. Apply class to HTML tag
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    if (profile) {
      try {
        await updateProfile({ theme: nextTheme });
      } catch (err) {
        console.error('Failed to save theme in profile:', err);
      }
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    if (profile) {
      try {
        await updateProfile({ theme: newTheme });
      } catch (err) {
        console.error('Failed to save theme in profile:', err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
