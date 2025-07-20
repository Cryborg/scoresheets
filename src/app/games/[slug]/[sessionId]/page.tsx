'use client';

import { useParams } from 'next/navigation';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { getGameComponent } from '@/lib/gameComponentLoader';
import AuthGuard from '@/components/AuthGuard';
import { authenticatedFetch } from '@/lib/authClient';

export default function GameSessionPage() {
  const params = useParams();
  const slug = params.slug as string;
  const sessionId = params.sessionId as string;
  
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchGameInfo = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/games/all');
      if (response.ok) {
        const data = await response.json();
        const game = data.games.find((g: any) => g.slug === slug);
        setGameInfo(game);
      }
    } catch (error) {
      console.error('Error fetching game info:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchGameInfo();
  }, [fetchGameInfo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
      </div>
    );
  }

  // Récupération du composant correspondant au jeu
  const ScoreSheetComponent = getGameComponent(gameInfo || slug);

  if (!ScoreSheetComponent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Jeu non disponible
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            La feuille de score pour ce jeu n&apos;est pas encore implémentée.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Retour au tableau de bord
          </a>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
      </div>
    }>
        <ScoreSheetComponent sessionId={sessionId} />
      </Suspense>
    </AuthGuard>
  );
}