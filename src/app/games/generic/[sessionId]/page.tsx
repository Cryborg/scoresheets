'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trophy } from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';

interface Player {
  id: number;
  name: string;
  position: number;
}

interface Round {
  round_number: number;
  scores: { [playerId: number]: number };
}

interface GameSession {
  id: number;
  session_name: string;
  has_score_target?: boolean;
  score_target?: number;
  finish_current_round?: boolean;
  score_direction?: string;
  players: Player[];
  rounds: Round[];
}

interface GenericSessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function GenericSessionPage({ params }: GenericSessionPageProps) {
  const router = useRouter();
  
  const [sessionId, setSessionId] = useState<string>('');
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentRound, setCurrentRound] = useState<{ [playerId: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function getParams() {
      const resolvedParams = await params;
      setSessionId(resolvedParams.sessionId);
    }
    getParams();
  }, [params]);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]); // fetchSession is stable, no need to include

  const fetchSession = async () => {
    try {
      const response = await authenticatedFetch(`/api/games/generic/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        
        const initialRound: { [playerId: number]: string } = {};
        data.session.players.forEach((player: Player) => {
          initialRound[player.id] = '';
        });
        setCurrentRound(initialRound);
      } else if (response.status === 404) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (playerId: number, score: string) => {
    setCurrentRound(prev => ({
      ...prev,
      [playerId]: score
    }));
  };

  const saveRound = async () => {
    if (!session) return;

    const scores = Object.entries(currentRound).map(([playerId, score]) => ({
      playerId: parseInt(playerId),
      score: parseInt(score) || 0
    }));

    const hasValidScores = scores.some(s => s.score !== 0);
    if (!hasValidScores) {
      alert('Veuillez saisir au moins un score');
      return;
    }

    setSaving(true);

    try {
      const response = await authenticatedFetch(`/api/games/generic/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scores }),
      });

      if (response.ok) {
        await fetchSession();
        
        const newRound: { [playerId: number]: string } = {};
        session.players.forEach(player => {
          newRound[player.id] = '';
        });
        setCurrentRound(newRound);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const getTotalScore = (playerId: number, upToRound?: number) => {
    if (!session) return 0;
    const roundsToCount = upToRound ? session.rounds.slice(0, upToRound) : session.rounds;
    return roundsToCount.reduce((total, round) => {
      const score = round.scores[playerId] || 0;
      const numericScore = typeof score === 'number' ? score : parseInt(String(score), 10);
      return total + (isNaN(numericScore) ? 0 : numericScore);
    }, 0);
  };

  const isGameFinished = (roundNumber: number) => {
    if (!session || !roundNumber) return false;
    
    if (!session.has_score_target || !session.score_target || session.score_target <= 0) return false;
    
    const someoneReachedTarget = session.players.some(player => {
      const playerScore = getTotalScore(player.id, roundNumber);
      // For 'lower' direction games, reaching target means >= target
      // For 'higher' direction games, reaching target means >= target
      return playerScore >= session.score_target!;
    });
    
    if (!someoneReachedTarget) return false;
    
    if (session.finish_current_round && session.rounds.length >= roundNumber) {
      const currentRound = session.rounds[roundNumber - 1];
      if (!currentRound) return false;
      
      return session.players.every(player => 
        currentRound.scores[player.id] !== undefined
      );
    }
    
    return true;
  };

  const getPlayerRanking = () => {
    if (!session) return [];
    
    return session.players
      .map(player => ({
        ...player,
        totalScore: getTotalScore(player.id)
      }))
      .sort((a, b) => {
        // Sort based on score direction: 'lower' means lower scores are better
        return session.score_direction === 'lower' 
          ? a.totalScore - b.totalScore  // Lower scores first
          : b.totalScore - a.totalScore; // Higher scores first
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-500">Partie non trouvée</div>
      </div>
    );
  }

  const ranking = getPlayerRanking();
  const nextRoundNumber = session.rounds.length + 1;
  const isCurrentGameFinished = session.rounds.length > 0 && isGameFinished(session.rounds.length);
  
  const someoneReachedTarget = session.has_score_target && session.score_target && session.score_target > 0 ? 
    session.players.some(player => getTotalScore(player.id) >= session.score_target) : 
    false;
  const waitingForRoundEnd = someoneReachedTarget && session.finish_current_round && !isCurrentGameFinished;

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
                {session.session_name}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {!isCurrentGameFinished && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                    Tour {nextRoundNumber}
                  </h3>
                  
                  {waitingForRoundEnd && (
                    <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Un joueur a atteint {session?.score_target ?? 0} points. 
                        La partie se terminera à la fin de ce tour.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {session.players.map((player) => (
                      <div key={player.id} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {player.name}
                        </label>
                        <input
                          type="number"
                          value={currentRound[player.id] || ''}
                          onChange={(e) => handleScoreChange(player.id, e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={saveRound}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Sauvegarde...' : 'Enregistrer les scores'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {session.rounds.length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                    Historique des scores
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Tour
                          </th>
                          {session.players.map((player) => (
                            <th key={player.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              {player.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                        {session.rounds.map((round) => (
                          <tr key={round.round_number}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {round.round_number}
                            </td>
                            {session.players.map((player) => (
                              <td key={player.id} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-300">
                                {round.scores[player.id] || 0}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                            Total
                          </td>
                          {session.players.map((player) => {
                            const total = getTotalScore(player.id);
                            const hasReachedTarget = session.has_score_target && session.score_target && session.score_target > 0 && total >= session.score_target;
                            return (
                              <td key={player.id} className={`px-6 py-4 whitespace-nowrap text-center text-sm font-bold ${
                                hasReachedTarget ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
                              }`}>
                                {total}
                                {hasReachedTarget && (
                                  <Trophy className="inline-block w-4 h-4 ml-1" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {isCurrentGameFinished && (
                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                      <p className="text-sm text-green-800 dark:text-green-200 font-semibold">
                        🎉 Partie terminée ! Gagnant : {ranking[0]?.name} avec {ranking[0]?.totalScore} points
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Classement
                </h3>
                
                {session.has_score_target && session.score_target && session.score_target > 0 ? (
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Score à atteindre : <span className="font-semibold">{session.score_target} points</span>
                  </div>
                ) : null}
                
                <div className="space-y-3">
                  {ranking.map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                          index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-300">
                          {player.totalScore} pts
                        </span>
                        {session.has_score_target && session.score_target && session.score_target > 0 && player.totalScore >= session.score_target ? (
                          <Trophy className="w-4 h-4 ml-2 text-yellow-500" />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}