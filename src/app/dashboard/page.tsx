'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Zap } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import RecentSessions from '@/components/RecentSessions';
import RulesModal from '@/components/RulesModal';
import { authenticatedFetch } from '@/lib/authClient';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; game: Game | null }>({ isOpen: false, game: null });
  const router = useRouter();
  const { user } = useAuth();

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

  const deleteSession = async (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId);
    const sessionName = session?.session_name || 'cette partie';
    
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


  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 mr-4"
                >
                  <Menu className="h-6 w-6 text-gray-900 dark:text-gray-300" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Fiches de Score
                </h1>
              </div>
              
              <div className="flex items-center">
                <Link
                  href="/games/generic/new"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Partie rapide</span>
                  <span className="sm:hidden">Nouvelle</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          games={games}
          onLogout={handleLogout}
          isAdmin={user?.is_admin}
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
            </div>
          ) : (
            <div>
              {/* Recent Sessions */}
              <RecentSessions 
                sessions={sessions}
                onDeleteSession={deleteSession}
                getGameUrl={getGameUrl}
              />
            </div>
          )}
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