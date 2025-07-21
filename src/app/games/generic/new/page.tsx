'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useGameSessionCreator } from '@/hooks/useGameSessionCreator';
import GameSessionForm from '@/components/GameSessionForm';

export default function NewGenericSessionPage() {
  const router = useRouter();
  const {
    state,
    updateState,
    updatePlayer,
    updateTeamPlayer,
    addPlayer,
    removePlayer,
    createSession
  } = useGameSessionCreator();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createSession('/api/games/generic/sessions', {
      scoreDirection: state.scoreDirection
    });
    
    if (result) {
      router.push(`/games/generic/${result.sessionId}`);
    }
  };

  return (
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
                  Nouvelle partie rapide
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Système de score simple et flexible
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
          game={null}
          onUpdateState={updateState}
          onUpdatePlayer={updatePlayer}
          onUpdateTeamPlayer={updateTeamPlayer}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          onSubmit={handleSubmit}
          submitButtonText="Créer la partie rapide"
        />
      </div>
    </div>
  );
}