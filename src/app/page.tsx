'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='));

    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Fiches de Score
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Redirection en cours...
        </p>
      </div>
    </div>
  );
}