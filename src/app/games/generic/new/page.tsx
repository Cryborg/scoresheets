'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Target, Save } from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';

interface Player {
  name: string;
}

export default function NewGenericSessionPage() {
  const router = useRouter();
  
  const [sessionName, setSessionName] = useState('');
  const [players, setPlayers] = useState<Player[]>([{ name: '' }, { name: '' }]);
  const [hasScoreTarget, setHasScoreTarget] = useState(false);
  const [scoreTarget, setScoreTarget] = useState('');
  const [finishCurrentRound, setFinishCurrentRound] = useState(false);
  const [scoreDirection, setScoreDirection] = useState('higher');
  const [loading, setLoading] = useState(false);
  const [suggestedPlayers, setSuggestedPlayers] = useState<string[]>([]);

  useEffect(() => {
    fetchSuggestedPlayers();
  }, []);

  const fetchSuggestedPlayers = async () => {
    try {
      const response = await authenticatedFetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        // Extract just the player names from the objects
        const playerNames = (data.players || []).map((player: any) => player.player_name);
        setSuggestedPlayers(playerNames);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const addPlayer = () => {
    if (players.length < 8) {
      setPlayers([...players, { name: '' }]);
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index].name = name;
    setPlayers(newPlayers);
  };

  const createSession = async () => {
    const validPlayers = players.filter(p => p.name.trim()).map(p => p.name.trim());
    
    if (validPlayers.length < 2) {
      alert('Il faut au moins 2 joueurs');
      return;
    }

    if (hasScoreTarget && (!scoreTarget || parseInt(scoreTarget) <= 0)) {
      alert('Veuillez saisir un score cible valide');
      return;
    }

    setLoading(true);

    try {
      // Create a session directly with the generic scoring system
      const response = await authenticatedFetch('/api/games/generic/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName: sessionName || 'Partie avec scores simples',
          players: validPlayers,
          hasScoreTarget,
          scoreTarget: hasScoreTarget ? parseInt(scoreTarget) : null,
          finishCurrentRound: hasScoreTarget ? finishCurrentRound : false,
          scoreDirection,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/games/generic/${data.sessionId}`);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erreur lors de la création de la partie');
      }
    } catch (error) {
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Nouvelle partie avec scores simples
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              {/* Nom de la partie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom de la partie
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Partie avec scores simples"
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Joueurs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Users className="h-4 w-4 inline mr-2" />
                    Joueurs
                  </label>
                  <button
                    onClick={addPlayer}
                    disabled={players.length >= 8}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                  >
                    + Ajouter un joueur
                  </button>
                </div>
                
                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={player.name}
                        onChange={(e) => updatePlayer(index, e.target.value)}
                        placeholder={`Joueur ${index + 1}`}
                        list={`players-${index}`}
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <datalist id={`players-${index}`}>
                        {suggestedPlayers.map((name, nameIndex) => (
                          <option key={`${index}-${nameIndex}-${name}`} value={name} />
                        ))}
                      </datalist>
                      {players.length > 2 && (
                        <button
                          onClick={() => removePlayer(index)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Score cible */}
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="hasScoreTarget"
                    checked={hasScoreTarget}
                    onChange={(e) => setHasScoreTarget(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hasScoreTarget" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Target className="h-4 w-4 inline mr-2" />
                    Définir un score cible
                  </label>
                </div>
                
                {hasScoreTarget && (
                  <div className="ml-7 space-y-3">
                    <div>
                      <input
                        type="number"
                        value={scoreTarget}
                        onChange={(e) => setScoreTarget(e.target.value)}
                        placeholder="100"
                        min="1"
                        className="block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        La partie se termine quand un joueur atteint ce score
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="finishCurrentRound"
                        checked={finishCurrentRound}
                        onChange={(e) => setFinishCurrentRound(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="finishCurrentRound" className="text-sm text-gray-700 dark:text-gray-300">
                        Finir le tour en cours quand quelqu'un atteint le score
                      </label>
                    </div>
                  </div>
                )}
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
                      Plus on a de points, mieux c'est (ex: la plupart des jeux)
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
                      Moins on a de points, mieux c'est (ex: golf, rami)
                    </label>
                  </div>
                </div>
              </div>

              {/* Bouton créer */}
              <div className="flex justify-end">
                <button
                  onClick={createSession}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Création...' : 'Créer la partie'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}