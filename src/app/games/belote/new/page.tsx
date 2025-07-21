'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';
import { useGameSessionCreator, Game } from '@/hooks/useGameSessionCreator';
import GameSessionForm from '@/components/GameSessionForm';
import AuthGuard from '@/components/AuthGuard';

export default function NewBeloteSessionPage() {
  const router = useRouter();
  
  // Hardcode Belote game properties since this is a specific page
  const beloteGame: Game = {
    id: 2, // Will be overridden by fetch
    name: 'Belote',
    slug: 'belote',
    team_based: true,
    min_players: 4,
    max_players: 4
  };
  
  const [game, setGame] = useState<Game>(beloteGame);
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

  const fetchBeloteGame = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/games');
      if (response.ok) {
        const data = await response.json();
        const foundGame = data.games.find((g: Game) => g.slug === 'belote');
        
        if (foundGame) {
          setGame(foundGame);
        }
      }
    } catch (err) {
      console.error('Error fetching Belote game:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBeloteGame();
  }, [fetchBeloteGame]);

  // Override default values for Belote
  useEffect(() => {
    updateState({
      hasScoreTarget: true,
      scoreTarget: '501'
    });
  }, [updateState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createSession('/api/games/belote/sessions');
    
    if (result) {
      router.push(`/games/belote/${result.sessionId}`);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Chargement de Belote...</p>
          </div>
        </div>
      </AuthGuard>
    );
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
                    Nouvelle partie de Belote
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Jeu en équipes • 4 joueurs exactement • Score cible recommandé: 501
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
            submitButtonText="Commencer la partie de Belote"
          />
        </div>
      </div>
    </AuthGuard>
  );
}