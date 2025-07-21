'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PlayerAutocomplete from '@/components/PlayerAutocomplete';
import AuthGuard from '@/components/AuthGuard';
import { authenticatedFetch } from '@/lib/authClient';

interface Game {
  id: number;
  name: string;
  slug: string;
  score_type: string;
  team_based: boolean;
  min_players: number;
  max_players: number;
}

export default function NewGamePage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  
  const [game, setGame] = useState<Game | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [teams, setTeams] = useState<{name: string, players: string[]}[]>([]);
  const [hasScoreTarget, setHasScoreTarget] = useState(false);
  const [scoreTarget, setScoreTarget] = useState<string>('');
  const [finishCurrentRound, setFinishCurrentRound] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchGame = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/games');
      if (response.ok) {
        const data = await response.json();
        const foundGame = data.games.find((g: Game) => g.slug === slug);
        
        if (!foundGame) {
          router.push('/dashboard');
          return;
        }

        setGame(foundGame);
        initializePlayers(foundGame);
      }
    } catch (err) {
      console.error('Error fetching game:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const initializePlayers = (game: Game) => {
    if (game.team_based) {
      const teamCount = game.max_players / 2;
      const playersPerTeam = 2;
      const newTeams = Array.from({ length: teamCount }, (_, i) => ({
        name: `Équipe ${i + 1}`,
        players: Array(playersPerTeam).fill('')
      }));
      setTeams(newTeams);
    } else {
      setPlayers(Array(game.min_players).fill(''));
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const updateTeamPlayer = (teamIndex: number, playerIndex: number, name: string) => {
    const newTeams = [...teams];
    newTeams[teamIndex].players[playerIndex] = name;
    setTeams(newTeams);
  };

  const addPlayer = () => {
    if (!game || players.length >= game.max_players) return;
    setPlayers([...players, '']);
  };

  const removePlayer = (index: number) => {
    if (!game || players.length <= game.min_players) return;
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game) return;
    
    const validPlayers = game.team_based 
      ? teams.flatMap(team => team.players).filter(p => p.trim())
      : players.filter(p => p.trim());
      
    if (validPlayers.length < game.min_players) {
      alert(`Il faut au moins ${game.min_players} joueurs`);
      return;
    }

    setSaving(true);

    try {
      const payload = game.team_based 
        ? { 
            sessionName: sessionName.trim() || `Partie de ${game.name}`, 
            teams,
            hasScoreTarget,
            scoreTarget: hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null,
            finishCurrentRound: hasScoreTarget ? finishCurrentRound : false
          }
        : { 
            sessionName: sessionName.trim() || `Partie de ${game.name}`, 
            players: validPlayers,
            hasScoreTarget,
            scoreTarget: hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null,
            finishCurrentRound: hasScoreTarget ? finishCurrentRound : false
          };

      const response = await authenticatedFetch(`/api/games/${slug}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/games/${slug}/${data.sessionId}`);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la création');
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

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-500">Jeu non trouvé</div>
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
                  Nouvelle partie de {game.name}
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
                <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom de la partie (optionnel)
                </label>
                <input
                  type="text"
                  id="sessionName"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder={`ex: Partie de ${game.name}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {game.team_based ? 'Équipes' : 'Joueurs'} ({game.min_players}-{game.max_players} joueurs)
                </label>
                
                {game.team_based ? (
                  <div className="space-y-6">
                    {teams.map((team, teamIndex) => (
                      <div key={teamIndex} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="mb-3">
                          <input
                            type="text"
                            value={team.name}
                            onChange={(e) => {
                              const newTeams = [...teams];
                              newTeams[teamIndex].name = e.target.value;
                              setTeams(newTeams);
                            }}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
                            placeholder={`Équipe ${teamIndex + 1}`}
                          />
                        </div>
                        <div className="space-y-2">
                          {team.players.map((player, playerIndex) => (
                            <PlayerAutocomplete
                              key={playerIndex}
                              value={player}
                              onChange={(value) => updateTeamPlayer(teamIndex, playerIndex, value)}
                              placeholder={`Joueur ${playerIndex + 1}`}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {players.map((player, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-1">
                          <PlayerAutocomplete
                            value={player}
                            onChange={(value) => updatePlayer(index, value)}
                            placeholder={`Joueur ${index + 1}`}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        {players.length > game.min_players && (
                          <button
                            type="button"
                            onClick={() => removePlayer(index)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {players.length < game.max_players && (
                      <button
                        type="button"
                        onClick={addPlayer}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        + Ajouter un joueur
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="hasScoreTarget"
                      type="checkbox"
                      checked={hasScoreTarget}
                      onChange={(e) => {
                        setHasScoreTarget(e.target.checked);
                        if (!e.target.checked) {
                          setScoreTarget('');
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="hasScoreTarget" className="font-medium text-gray-700 dark:text-gray-300">
                      La partie se termine à un score précis
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      La partie prendra fin quand un joueur atteindra le score défini
                    </p>
                  </div>
                </div>
                
                {hasScoreTarget && (
                  <div className="ml-7 space-y-3">
                    <div>
                      <label htmlFor="scoreTarget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Score à atteindre
                      </label>
                      <input
                        type="number"
                        id="scoreTarget"
                        min="1"
                        value={scoreTarget}
                        onChange={(e) => setScoreTarget(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="ex: 100, 500, 1000..."
                        required={hasScoreTarget}
                      />
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="finishCurrentRound"
                          type="checkbox"
                          checked={finishCurrentRound}
                          onChange={(e) => setFinishCurrentRound(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="finishCurrentRound" className="font-medium text-gray-700 dark:text-gray-300">
                          Terminer le tour de tous les joueurs
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Même si un joueur atteint le score cible, tous les joueurs finissent leur tour
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Création...' : 'Créer la partie'}
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