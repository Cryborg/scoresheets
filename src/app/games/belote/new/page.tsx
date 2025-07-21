'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Target, 
  Play,
  GamepadIcon,
  Crown
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';
import PlayerInput from '@/components/PlayerInput';
import GameSetupCard from '@/components/GameSetupCard';

export default function NewBeloteSessionPage() {
  const router = useRouter();
  
  const [sessionName, setSessionName] = useState('');
  const [teams, setTeams] = useState([
    { players: ['', ''] },
    { players: ['', ''] }
  ]);
  const [hasScoreTarget, setHasScoreTarget] = useState(true);
  const [scoreTarget, setScoreTarget] = useState('501');
  const [finishCurrentRound, setFinishCurrentRound] = useState(false);
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
        const playerNames = (data.players || []).map((player: { player_name: string }) => player.player_name);
        setSuggestedPlayers(playerNames);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const updateTeamPlayer = (teamIndex: number, playerIndex: number, name: string) => {
    const newTeams = [...teams];
    newTeams[teamIndex].players[playerIndex] = name;
    setTeams(newTeams);
  };

  const createSession = async () => {
    // Validation
    const allPlayers: string[] = [];
    teams.forEach(team => {
      team.players.forEach(player => {
        if (player.trim()) {
          allPlayers.push(player.trim());
        }
      });
    });
    
    if (allPlayers.length !== 4) {
      alert('Il faut exactement 4 joueurs (2 par équipe)');
      return;
    }

    // Check for duplicate names
    const uniquePlayers = new Set(allPlayers);
    if (uniquePlayers.size !== 4) {
      alert('Tous les joueurs doivent avoir des noms différents');
      return;
    }

    if (hasScoreTarget && (!scoreTarget || parseInt(scoreTarget) <= 0)) {
      alert('Veuillez saisir un score cible valide');
      return;
    }

    setLoading(true);

    try {
      const response = await authenticatedFetch('/api/games/belote/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName: sessionName || 'Partie de Belote',
          teams: teams.map(team => ({
            players: team.players.filter(p => p.trim())
          })),
          hasScoreTarget,
          scoreTarget: hasScoreTarget ? parseInt(scoreTarget) : null,
          finishCurrentRound: hasScoreTarget ? finishCurrentRound : false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/games/belote/${data.sessionId}`);
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
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
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nouvelle partie de Belote
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Jeu de cartes traditionnel en équipes
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
              description="Donnez un nom à votre partie de Belote"
              icon={GamepadIcon}
            >
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Partie de Belote du..."
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all shadow-sm hover:shadow-md focus:shadow-lg"
              />
            </GameSetupCard>
          </div>

          {/* Équipes */}
          <div className="lg:col-span-2">
            <GameSetupCard
              title="Équipes"
              description="4 joueurs organisés en 2 équipes de 2"
              icon={Users}
            >
              <div className="space-y-6">
                {teams.map((team, teamIndex) => (
                  <div key={teamIndex} className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                      <Crown className="h-4 w-4 mr-2 text-red-500" />
                      Équipe {teamIndex + 1}
                    </h4>
                    <div className="space-y-3">
                      {team.players.map((player, playerIndex) => (
                        <PlayerInput
                          key={`${teamIndex}-${playerIndex}`}
                          value={player}
                          onChange={(value) => updateTeamPlayer(teamIndex, playerIndex, value)}
                          placeholder={`Joueur ${playerIndex + 1} - Équipe ${teamIndex + 1}`}
                          suggestions={suggestedPlayers}
                          canRemove={false}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GameSetupCard>
          </div>

          {/* Configuration */}
          <div className="space-y-8">
            {/* Score cible */}
            <GameSetupCard
              title="Score cible"
              description="Objectif de points pour gagner"
              icon={Target}
            >
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasScoreTarget}
                    onChange={(e) => setHasScoreTarget(e.target.checked)}
                    className="w-5 h-5 text-red-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 dark:focus:ring-red-600 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Définir un score cible
                  </span>
                </label>
                
                {hasScoreTarget && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <input
                        type="number"
                        value={scoreTarget}
                        onChange={(e) => setScoreTarget(e.target.value)}
                        placeholder="501"
                        min="100"
                        step="50"
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Tradition : 501 points (peut être 1001 pour une partie longue)
                      </p>
                    </div>
                    
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={finishCurrentRound}
                        onChange={(e) => setFinishCurrentRound(e.target.checked)}
                        className="w-5 h-5 text-red-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 dark:focus:ring-red-600 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Finir la donne en cours
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </GameSetupCard>

            {/* Règles rappel */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-red-500" />
                Règles Belote
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• <strong>4 joueurs</strong> en 2 équipes face à face</p>
                <p>• <strong>32 cartes</strong> (7, 8, 9, 10, V, D, R, As)</p>
                <p>• <strong>162 points</strong> par donne</p>
                <p>• <strong>Belote/Rebelote :</strong> +20 points</p>
                <p>• <strong>Premier à {scoreTarget} points</strong> gagne</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton créer - sticky bottom */}
        <div className="sticky bottom-6 mt-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Prêt pour la belote ?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  4 joueurs • 2 équipes • {hasScoreTarget ? `Objectif: ${scoreTarget} points` : 'Partie libre'}
                </p>
              </div>
              <button
                onClick={createSession}
                disabled={loading || teams.some(team => team.players.some(p => !p.trim()))}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
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