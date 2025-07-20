'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  try {
    const { theme, toggleTheme } = useTheme();

    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Basculer le thème"
      >
        {theme === 'light' ? (
          <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>
    );
  } catch {
    return (
      <button
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Basculer le thème"
      >
        <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </button>
    );
  }
}