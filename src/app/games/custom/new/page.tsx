'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { authenticatedFetch } from '@/lib/authClient';

interface GameCategory {
  id: number;
  name: string;
}

export default function NewCustomGamePage() {
  const router = useRouter();
  
  const [gameName, setGameName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [teamBased, setTeamBased] = useState(false);
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [rules, setRules] = useState('');
  const [scoreDirection, setScoreDirection] = useState('higher');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await authenticatedFetch('/api/game-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
        if (data.categories && data.categories.length > 0) {
          setCategoryId(data.categories[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameName.trim() || !categoryId) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);

    try {
      const slug = generateSlug(gameName);
      
      const payload = {
        name: gameName.trim(),
        slug,
        categoryId: parseInt(categoryId),
        rules: rules.trim() || `Règles pour ${gameName.trim()}`,
        teamBased,
        minPlayers,
        maxPlayers,
        scoreDirection
      };

      const response = await authenticatedFetch('/api/games/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push(`/games/${slug}/new`);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la création du jeu');
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Créer un jeu avec scores simples
                </h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="gameName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom du jeu *
                </label>
                <input
                  type="text"
                  id="gameName"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="ex: Mon jeu de société"
                  required
                />
              </div>

              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Catégorie *
                </label>
                <select
                  id="categoryId"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="minPlayers" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre minimum de joueurs
                  </label>
                  <input
                    type="number"
                    id="minPlayers"
                    min="1"
                    max="20"
                    value={minPlayers}
                    onChange={(e) => setMinPlayers(parseInt(e.target.value) || 2)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre maximum de joueurs
                  </label>
                  <input
                    type="number"
                    id="maxPlayers"
                    min="1"
                    max="20"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 6)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="teamBased"
                    type="checkbox"
                    checked={teamBased}
                    onChange={(e) => setTeamBased(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="teamBased" className="font-medium text-gray-700 dark:text-gray-300">
                    Jeu en équipes
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Les joueurs sont organisés en équipes de 2
                  </p>
                </div>
              </div>

              {/* Direction des scores */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Type de classement
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="scoreHigher"
                      name="scoreDirection"
                      value="higher"
                      checked={scoreDirection === 'higher'}
                      onChange={(e) => setScoreDirection(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="scoreHigher" className="text-sm text-gray-700 dark:text-gray-300">
                      Plus on a de points, mieux c&apos;est (ex: la plupart des jeux)
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="scoreLower"
                      name="scoreDirection"
                      value="lower"
                      checked={scoreDirection === 'lower'}
                      onChange={(e) => setScoreDirection(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="scoreLower" className="text-sm text-gray-700 dark:text-gray-300">
                      Moins on a de points, mieux c&apos;est (ex: golf, rami)
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="rules" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Règles du jeu (optionnel)
                </label>
                <textarea
                  id="rules"
                  rows={4}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Décrivez brièvement les règles de votre jeu..."
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  À propos des jeux avec scores simples
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Ce type de jeu convient aux jeux où l&apos;on compte simplement les points à chaque tour : 
                  jeux de cartes, de dés, de plateau... Chaque joueur accumule des points et vous pouvez 
                  optionnellement définir un score à atteindre pour terminer la partie.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Création...' : 'Créer le jeu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      </div>
    </AuthGuard>
  );
}