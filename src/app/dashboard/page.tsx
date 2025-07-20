'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Calendar, Trash2, ExternalLink, Info, Gamepad2, Plus } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import RulesModal from '@/components/RulesModal';
import { authenticatedFetch } from '@/lib/authClient';
import AuthGuard from '@/components/AuthGuard';

interface GameSession {
  id: number;
  session_name: string;
  game_name: string;
  game_id: number | null;
  date_played: string;
  player_count: number;
  scores_summary: string;
}

interface Game {
  id: number;
  name: string;
  slug: string;
  rules: string;
  category_name: string;
  is_implemented: boolean;
  score_type: string;
  team_based: boolean;
  min_players: number;
  max_players: number;
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; game: Game | null }>({ isOpen: false, game: null });
  const router = useRouter();

  useEffect(() => {
    fetchSessions();
    fetchGames();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await authenticatedFetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const response = await authenticatedFetch('/api/games');
      if (response.ok) {
        const data = await response.json();
        setGames(data.games || []);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const deleteSession = async (sessionId: number, sessionName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la partie "${sessionName}" ?`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erreur de connexion');
    }
  };

  const getGameUrl = (session: GameSession) => {
    // Handle generic sessions (no game_id)
    if (!session.game_id) {
      return `/games/generic/${session.id}`;
    }
    
    // Find the game slug from the games list
    const game = games.find(g => g.name === session.game_name);
    return game?.is_implemented ? `/games/${game.slug}/${session.id}` : '#';
  };

  const getNewGameUrl = (game: Game) => {
    return game.is_implemented ? `/games/${game.slug}/new` : '#';
  };

  const showRules = (game: Game) => {
    setRulesModal({ isOpen: true, game });
  };

  const getGameIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Jeux de cartes': return '🃏';
      case 'Jeux de dés': return '🎲';
      case 'Jeux de plis': return '♠️';
      default: return '🎮';
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Fiches de Score
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Tableau de bord
            </h2>
            
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Jeux disponibles
                </h3>
                <Link
                  href="/games/generic/new"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Partie avec scores simples
                </Link>
              </div>
              {Object.entries(games.reduce((acc, game) => {
                if (!acc[game.category_name]) acc[game.category_name] = [];
                acc[game.category_name].push(game);
                return acc;
              }, {} as Record<string, Game[]>)).map(([category, categoryGames]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                    <span className="text-xl mr-2">{getGameIcon(category)}</span>
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryGames.map((game) => (
                      <div key={game.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-blue-500">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                              {game.name}
                            </h5>
                            <div className="flex items-center space-x-2 mt-2">
                              {game.is_implemented ? (
                                <Link
                                  href={getNewGameUrl(game)}
                                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                  <Gamepad2 className="h-4 w-4 mr-1" />
                                  Jouer
                                </Link>
                              ) : (
                                <div className="flex items-center px-3 py-1 text-sm bg-gray-300 text-gray-600 rounded-md cursor-not-allowed dark:bg-gray-600 dark:text-gray-400">
                                  <Gamepad2 className="h-4 w-4 mr-1" />
                                  Bientôt
                                </div>
                              )}
                              <button
                                onClick={() => showRules(game)}
                                className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                              >
                                <Info className="h-4 w-4 mr-1" />
                                Règles
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Parties jouées
                    </h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {sessions.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Parties récentes
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    Aucune partie enregistrée
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Commencez votre première partie en cliquant sur l'un des jeux ci-dessus
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="border dark:border-gray-600 rounded-lg p-4 transition-colors"
                    >
                      {/* Layout responsive */}
                      <div className="flex items-start justify-between">
                        {/* Mobile: titre et infos empilés, Desktop: titre à gauche, infos au centre */}
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center">
                          {/* Titre et nom du jeu */}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {session.session_name || session.game_name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {session.game_name}
                            </p>
                          </div>
                          
                          {/* Infos de la partie - sous le titre sur mobile, au centre sur desktop */}
                          <div className="mt-2 sm:mt-0 sm:text-right sm:pr-4">
                            <div className="flex items-center sm:justify-end text-sm text-gray-500 dark:text-gray-400 mb-1">
                              <Users className="h-4 w-4 mr-1" />
                              {session.player_count} joueur{session.player_count > 1 ? 's' : ''}
                            </div>
                            {session.scores_summary && (
                              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                                {session.scores_summary}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(session.date_played).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                        
                        {/* Boutons d'action - à droite */}
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 ml-4">
                          <Link
                            href={getGameUrl(session)}
                            className="flex items-center justify-center p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Continuer la partie"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => deleteSession(session.id, session.session_name || session.game_name)}
                            className="flex items-center justify-center p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Supprimer la partie"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {rulesModal.game && (
        <RulesModal
          isOpen={rulesModal.isOpen}
          onClose={() => setRulesModal({ isOpen: false, game: null })}
          game={rulesModal.game}
        />
      )}
      </div>
    </AuthGuard>
  );
}