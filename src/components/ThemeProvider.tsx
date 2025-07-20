'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('ThemeProvider: Initializing theme');
    const savedTheme = localStorage.getItem('theme') as Theme;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    console.log('ThemeProvider: Initial theme determined:', initialTheme);
    setTheme(initialTheme);
    setMounted(true);
    console.log('ThemeProvider: Mounted state set to true');
  }, []);

  useEffect(() => {
    if (mounted) {
      console.log('ThemeProvider: Applying theme:', theme);
      localStorage.setItem('theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  if (!mounted) {
    console.log('ThemeProvider: Not mounted yet, showing loading state');
    // Rendu identique côté serveur et client avant hydratation
    return (
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme }}>
        <div suppressHydrationWarning className="min-h-screen bg-gray-50">
          {children}
        </div>
      </ThemeContext.Provider>
    );
  }

  console.log('ThemeProvider: Fully mounted, rendering with theme:', theme);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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