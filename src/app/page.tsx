'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('HomePage: Setting mounted to true');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      console.log('HomePage: Not mounted yet, skipping auth check');
      return;
    }
    
    console.log('HomePage: Checking authentication, cookies:', document.cookie);
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='));

    console.log('HomePage: Auth token found:', !!token);
    if (token) {
      console.log('HomePage: Redirecting to dashboard');
      router.push('/dashboard');
    } else {
      console.log('HomePage: Redirecting to login');
      router.push('/auth/login');
    }
  }, [router, mounted]);

  if (!mounted) {
    console.log('HomePage: Not mounted yet, showing loading state');
    return (
      <div suppressHydrationWarning className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Fiches de Score
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  console.log('HomePage: Mounted, auth check completed');
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