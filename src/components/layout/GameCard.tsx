'use client';

import { ReactNode } from 'react';

interface GameCardProps {
  title: string;
  children: ReactNode;
}

export default function GameCard({ title, children }: GameCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}