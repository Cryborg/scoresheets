'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';
import { useGameSessionCreator, Game } from '@/hooks/useGameSessionCreator';
import GameSessionForm from '@/components/GameSessionForm';
import AuthGuard from '@/components/AuthGuard';

export default function NewGamePage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  
  const {
    state,
    updateState,
    updatePlayer,
    updateTeamPlayer,
    addPlayer,
    removePlayer,
    createSession
  } = useGameSessionCreator(game);

  const fetchGame = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/games');
      if (response.ok) {
        const data = await response.json();
        const foundGame = data.games.find((g: Game) => g.slug === slug);
        
        if (!foundGame) {
          router.push('/dashboard');
          return;
        }

        setGame(foundGame);
      }
    } catch (err) {
      console.error('Error fetching game:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game) return;
    
    const result = await createSession(`/api/games/${slug}/sessions`);
    
    if (result) {
      router.push(`/games/${slug}/${result.sessionId}`);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Chargement du jeu...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!game) {
    return null;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Nouvelle partie de {game.name}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {game.team_based ? 'Jeu en équipes' : 'Jeu individuel'} • {game.min_players}-{game.max_players} joueurs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <GameSessionForm
            state={state}
            game={game}
            onUpdateState={updateState}
            onUpdatePlayer={updatePlayer}
            onUpdateTeamPlayer={updateTeamPlayer}
            onAddPlayer={addPlayer}
            onRemovePlayer={removePlayer}
            onSubmit={handleSubmit}
            submitButtonText={`Commencer la partie de ${game.name}`}
          />
        </div>
      </div>
    </AuthGuard>
  );
}