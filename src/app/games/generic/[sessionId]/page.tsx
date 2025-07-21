'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trophy } from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';
import GameLayout from '@/components/layout/GameLayout';
import GameCard from '@/components/layout/GameCard';
import RankingSidebar from '@/components/layout/RankingSidebar';

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

  const fetchSession = useCallback(async () => {
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
  }, [sessionId, router]);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId, fetchSession]);

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
    <GameLayout 
      sessionName={session.session_name}
      sidebar={
        <RankingSidebar
          players={ranking}
          scoreTarget={session.score_target}
          hasScoreTarget={session.has_score_target}
        />
      }
    >
            {!isCurrentGameFinished && (
              <GameCard title={`Tour ${nextRoundNumber}`}>
                  
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
              </GameCard>
            )}

            {session.rounds.length > 0 && (
              <GameCard title="Historique des scores">
                  
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
              </GameCard>
            )}
    </GameLayout>
  );
}