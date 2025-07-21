'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Target, 
  Play, 
  Plus,
  GamepadIcon,
  Settings,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';
import PlayerInput from '@/components/PlayerInput';
import GameSetupCard from '@/components/GameSetupCard';

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
        const playerNames = (data.players || []).map((player: { player_name: string }) => player.player_name);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link 
              href="/dashboard" 
              className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mr-6 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Retour</span>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <GamepadIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nouvelle partie
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Créez une partie avec scores personnalisés
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Nom de la partie */}
          <div className="lg:col-span-3">
            <GameSetupCard
              title="Nom de la partie"
              description="Donnez un nom à votre partie pour la retrouver facilement"
              icon={GamepadIcon}
            >
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Ma super partie de..."
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md focus:shadow-lg"
              />
            </GameSetupCard>
          </div>

          {/* Joueurs */}
          <div className="lg:col-span-2">
            <GameSetupCard
              title="Joueurs"
              description="Ajoutez entre 2 et 8 joueurs pour cette partie"
              icon={Users}
            >
              <div className="space-y-4">
                {players.map((player, index) => (
                  <PlayerInput
                    key={index}
                    value={player.name}
                    onChange={(value) => updatePlayer(index, value)}
                    onRemove={players.length > 2 ? () => removePlayer(index) : undefined}
                    placeholder={`Joueur ${index + 1}`}
                    suggestions={suggestedPlayers}
                    canRemove={players.length > 2}
                    autoFocus={index === players.length - 1 && players.length > 2}
                  />
                ))}
                
                {players.length < 8 && (
                  <button
                    onClick={addPlayer}
                    className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ajouter un joueur</span>
                  </button>
                )}
              </div>
            </GameSetupCard>
          </div>

          {/* Configuration */}
          <div className="space-y-8">
            {/* Score cible */}
            <GameSetupCard
              title="Score cible"
              description="Optionnel : définir un objectif de score"
              icon={Target}
            >
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasScoreTarget}
                    onChange={(e) => setHasScoreTarget(e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Activer le score cible
                  </span>
                </label>
                
                {hasScoreTarget && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <input
                        type="number"
                        value={scoreTarget}
                        onChange={(e) => setScoreTarget(e.target.value)}
                        placeholder="100"
                        min="1"
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        La partie se termine quand un joueur atteint ce score
                      </p>
                    </div>
                    
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={finishCurrentRound}
                        onChange={(e) => setFinishCurrentRound(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Finir le tour en cours
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </GameSetupCard>

            {/* Type de classement */}
            <GameSetupCard
              title="Classement"
              description="Comment les scores sont-ils comptés ?"
              icon={Settings}
            >
              <div className="space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="radio"
                    name="scoreDirection"
                    value="higher"
                    checked={scoreDirection === 'higher'}
                    onChange={(e) => setScoreDirection(e.target.value)}
                    className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Plus = mieux
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Comme la plupart des jeux
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="radio"
                    name="scoreDirection"
                    value="lower"
                    checked={scoreDirection === 'lower'}
                    onChange={(e) => setScoreDirection(e.target.value)}
                    className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Moins = mieux
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Golf, Rami, etc.
                    </p>
                  </div>
                </label>
              </div>
            </GameSetupCard>
          </div>
        </div>

        {/* Bouton créer - sticky bottom */}
        <div className="sticky bottom-6 mt-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Prêt à jouer ?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {players.filter(p => p.name.trim()).length} joueur{players.filter(p => p.name.trim()).length > 1 ? 's' : ''} • 
                  {hasScoreTarget ? ` Objectif: ${scoreTarget} points` : ' Partie libre'}
                </p>
              </div>
              <button
                onClick={createSession}
                disabled={loading || players.filter(p => p.name.trim()).length < 2}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Play className="h-5 w-5 mr-2" />
                {loading ? 'Création...' : 'Créer la partie'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}