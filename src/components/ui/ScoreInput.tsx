'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, Save } from 'lucide-react';

interface ScoreInputProps {
  value: string | number;
  onChange: (value: string) => void;
  onSave?: () => void;
  min?: number;
  max?: number;
  step?: number;
  validValues?: number[];
  disabled?: boolean;
  showButtons?: boolean;
  showSaveButton?: boolean;
  autoSaveOnButtons?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  placeholder?: string;
}

export default function ScoreInput({
  value,
  onChange,
  onSave,
  min = 0,
  max,
  step = 1,
  validValues,
  disabled = false,
  showButtons = true,
  showSaveButton = false,
  autoSaveOnButtons = true,
  size = 'md',
  className = '',
  placeholder
}: ScoreInputProps) {
  const [internalValue, setInternalValue] = useState(value.toString());

  useEffect(() => {
    setInternalValue(value.toString());
  }, [value]);

  const getNextValidValue = (currentValue: number, direction: 'up' | 'down'): number => {
    if (validValues) {
      const sortedValues = [...validValues].sort((a, b) => a - b);
      const currentIndex = sortedValues.indexOf(currentValue);
      
      if (direction === 'up') {
        if (currentIndex === -1) {
          // Si la valeur actuelle n'est pas dans la liste, prendre la première valeur supérieure
          const nextValue = sortedValues.find(v => v > currentValue);
          return nextValue || sortedValues[sortedValues.length - 1];
        }
        return currentIndex < sortedValues.length - 1 ? sortedValues[currentIndex + 1] : sortedValues[currentIndex];
      } else {
        if (currentIndex === -1) {
          // Si la valeur actuelle n'est pas dans la liste, prendre la première valeur inférieure
          const reversedValues = [...sortedValues].reverse();
          const prevValue = reversedValues.find(v => v < currentValue);
          return prevValue || sortedValues[0];
        }
        return currentIndex > 0 ? sortedValues[currentIndex - 1] : sortedValues[currentIndex];
      }
    }
    
    // Comportement normal avec step
    if (direction === 'up') {
      return Math.min(max || Infinity, currentValue + step);
    } else {
      return Math.max(min, currentValue - step);
    }
  };

  const handleIncrement = () => {
    const currentValue = parseInt(internalValue) || 0;
    const newValue = getNextValidValue(currentValue, 'up');
    const newValueStr = newValue.toString();
    setInternalValue(newValueStr);
    onChange(newValueStr);
    
    // Auto-save when using +/- buttons (if enabled)
    if (onSave && autoSaveOnButtons && newValueStr !== '0') {
      setTimeout(() => onSave(), 100); // Small delay to ensure state is updated
    }
  };

  const handleDecrement = () => {
    const currentValue = parseInt(internalValue) || 0;
    const newValue = getNextValidValue(currentValue, 'down');
    const newValueStr = newValue.toString();
    setInternalValue(newValueStr);
    onChange(newValueStr);
    
    // Auto-save when using +/- buttons (if enabled)
    if (onSave && autoSaveOnButtons && newValueStr !== '0') {
      setTimeout(() => onSave(), 100); // Small delay to ensure state is updated
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
  };

  const handleBlur = () => {
    if (onSave && internalValue && internalValue.trim() !== '') {
      onSave();
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      input: 'w-12 h-6 text-sm',
      button: 'w-6 h-6',
      icon: 'h-3 w-3',
      spacing: 'space-x-1'
    },
    md: {
      input: 'w-14 h-8 sm:w-16 sm:h-10 text-base sm:text-lg',
      button: 'w-8 h-8 sm:w-10 sm:h-10',
      icon: 'h-4 w-4 sm:h-5 sm:w-5',
      spacing: 'space-x-1 sm:space-x-2'
    },
    lg: {
      input: 'w-16 h-10 sm:w-20 sm:h-12 text-lg sm:text-xl',
      button: 'w-10 h-10 sm:w-12 sm:h-12',
      icon: 'h-5 w-5 sm:h-6 sm:w-6',
      spacing: 'space-x-2'
    }
  };

  const config = sizeConfig[size];

  if (!showButtons) {
    return (
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={internalValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className={`${config.input} text-center font-semibold border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center ${config.spacing}`}>
      {/* Bouton - */}
      <button
        onClick={handleDecrement}
        disabled={disabled}
        className={`${config.button} flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-lg transition-colors dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Minus className={config.icon} />
      </button>
      
      {/* Champ de saisie */}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={internalValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className={`${config.input} text-center font-semibold border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      />
      
      {/* Bouton + */}
      <button
        onClick={handleIncrement}
        disabled={disabled}
        className={`${config.button} flex items-center justify-center bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700 rounded-lg transition-colors dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Plus className={config.icon} />
      </button>
      
      {/* Bouton de sauvegarde optionnel */}
      {showSaveButton && onSave && (
        <button
          onClick={onSave}
          disabled={disabled || !internalValue || internalValue.trim() === ''}
          className={`${config.button} flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 rounded-lg transition-colors dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Save className={config.icon} />
        </button>
      )}
    </div>
  );
}