'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Calendar, 
  Trash2, 
  ExternalLink,
  Clock
} from 'lucide-react';

interface GameSession {
  id: number;
  session_name: string;
  game_name: string;
  game_id: number | null;
  date_played: string;
  player_count: number;
  scores_summary: string;
}

interface RecentSessionsProps {
  sessions: GameSession[];
  onDeleteSession: (id: number) => void;
  getGameUrl: (session: GameSession) => string;
}

export default function RecentSessions({ 
  sessions, 
  onDeleteSession, 
  getGameUrl 
}: RecentSessionsProps) {
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());

  // Ensure sessions is an array
  const sessionsArray = Array.isArray(sessions) ? sessions : [];

  // Group sessions by game
  const sessionsByGame = sessionsArray.reduce((acc, session) => {
    const gameName = session.game_name || 'Jeu générique';
    if (!acc[gameName]) {
      acc[gameName] = [];
    }
    acc[gameName].push(session);
    return acc;
  }, {} as Record<string, GameSession[]>);

  const toggleGame = (gameName: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameName)) {
      newExpanded.delete(gameName);
    } else {
      newExpanded.add(gameName);
    }
    setExpandedGames(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Aujourd\'hui';
    if (diffDays === 2) return 'Hier';
    if (diffDays <= 7) return `Il y a ${diffDays - 1} jours`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Aucune partie récente
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Créez votre première partie pour commencer !
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Parties récentes
      </h2>

      {Object.entries(sessionsByGame).map(([gameName, gameSessions]) => (
        <div key={gameName} className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <button
            onClick={() => toggleGame(gameName)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {expandedGames.has(gameName) ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {gameName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {gameSessions.length} partie{gameSessions.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {gameSessions.length}
              </span>
            </div>
          </button>

          {expandedGames.has(gameName) && (
            <div className="border-t dark:border-gray-700">
              <div className="p-4 space-y-3">
                {gameSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {session.session_name}
                      </h4>
                      <div className="flex items-center mt-1 space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {session.player_count} joueur{session.player_count > 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(session.date_played)}
                        </div>
                      </div>
                      {session.scores_summary && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">
                          {session.scores_summary}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        href={getGameUrl(session)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Continuer la partie"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => onDeleteSession(session.id)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Supprimer la partie"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}