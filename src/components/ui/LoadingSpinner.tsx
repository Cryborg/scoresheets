'use client';

import { LOADING_MESSAGES } from '@/lib/constants';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  message = LOADING_MESSAGES.DEFAULT, 
  className = "min-h-screen bg-gray-50 dark:bg-gray-900" 
}: LoadingSpinnerProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="text-gray-500 dark:text-gray-400">{message}</div>
    </div>
  );
}