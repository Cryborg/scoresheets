'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import GameCard from '@/components/layout/GameCard';

interface Game {
  id: number;
  name: string;
  slug: string;
  category_name: string;
  is_implemented: boolean;
  min_players: number;
  max_players: number;
  team_based: boolean;
}

interface NewGame {
  name: string;
  slug: string;
  category_id: number;
  rules: string;
  is_implemented: boolean;
  score_type: string;
  team_based: boolean;
  min_players: number;
  max_players: number;
  score_direction: string;
}

interface Category {
  id: number;
  name: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGame, setNewGame] = useState<NewGame>({
    name: '',
    slug: '',
    category_id: 1,
    rules: '',
    is_implemented: false,
    score_type: 'rounds',
    team_based: false,
    min_players: 2,
    max_players: 6,
    score_direction: 'higher'
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Check if user is admin
    if (!user.is_admin) {
      router.push('/dashboard');
      return;
    }
    
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      const [gamesRes, categoriesRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/admin/categories')
      ]);
      
      const gamesData = await gamesRes.json();
      const categoriesData = await categoriesRes.json();
      
      setGames(gamesData.games || []);
      setCategories(categoriesData.categories || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGame)
      });

      if (response.ok) {
        setShowAddForm(false);
        setNewGame({
          name: '',
          slug: '',
          category_id: 1,
          rules: '',
          is_implemented: false,
          score_type: 'rounds',
          team_based: false,
          min_players: 2,
          max_players: 6,
          score_direction: 'higher'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setNewGame(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <GameCard title="Gestion des jeux">
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? 'Annuler' : 'Ajouter un jeu'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddGame} className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du jeu</label>
                  <input
                    type="text"
                    value={newGame.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slug</label>
                  <input
                    type="text"
                    value={newGame.slug}
                    onChange={(e) => setNewGame(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catégorie</label>
                  <select
                    value={newGame.category_id}
                    onChange={(e) => setNewGame(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type de score</label>
                  <select
                    value={newGame.score_type}
                    onChange={(e) => setNewGame(prev => ({ ...prev, score_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rounds">Manches</option>
                    <option value="categories">Catégories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Joueurs min</label>
                  <input
                    type="number"
                    value={newGame.min_players}
                    onChange={(e) => setNewGame(prev => ({ ...prev, min_players: parseInt(e.target.value) }))}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Joueurs max</label>
                  <input
                    type="number"
                    value={newGame.max_players}
                    onChange={(e) => setNewGame(prev => ({ ...prev, max_players: parseInt(e.target.value) }))}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="team_based"
                    checked={newGame.team_based}
                    onChange={(e) => setNewGame(prev => ({ ...prev, team_based: e.target.checked }))}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="team_based" className="text-sm font-medium text-gray-700 dark:text-gray-300">Jeu en équipes</label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_implemented"
                    checked={newGame.is_implemented}
                    onChange={(e) => setNewGame(prev => ({ ...prev, is_implemented: e.target.checked }))}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_implemented" className="text-sm font-medium text-gray-700 dark:text-gray-300">Implémenté</label>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Règles</label>
                <textarea
                  value={newGame.rules}
                  onChange={(e) => setNewGame(prev => ({ ...prev, rules: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Règles du jeu en markdown..."
                />
              </div>

              <button
                type="submit"
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                Ajouter le jeu
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map(game => (
              <div key={game.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{game.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    game.is_implemented 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {game.is_implemented ? 'Implémenté' : 'Non implémenté'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{game.category_name}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {game.min_players === game.max_players 
                    ? `${game.min_players} joueur${game.min_players > 1 ? 's' : ''}`
                    : `${game.min_players}-${game.max_players} joueurs`
                  }
                  {game.team_based && ' (en équipes)'}
                </p>
              </div>
            ))}
          </div>
        </GameCard>
      </div>
    </AdminLayout>
  );
}