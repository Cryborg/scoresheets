'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, X } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';

interface Player {
  id: number;
  name: string;
  position: number;
}

interface YamsCategory {
  id: string;
  name: string;
  description: string;
  calculate: (scores: { [playerId: number]: number }) => number;
}

interface GameSession {
  id: number;
  session_name: string;
  score_target?: number;
  players: Player[];
  scores: { [categoryId: string]: { [playerId: number]: number | undefined } };
}

interface YamsCategoryExtended extends YamsCategory {
  fixedScore?: number;
  step?: number;
  maxValue?: number;
  validValues?: number[];
}

const YAMS_CATEGORIES: YamsCategoryExtended[] = [
  { id: 'ones', name: '1', description: 'Somme des 1', calculate: () => 0, validValues: [0, 1, 2, 3, 4, 5] },
  { id: 'twos', name: '2', description: 'Somme des 2', calculate: () => 0, validValues: [0, 2, 4, 6, 8, 10] },
  { id: 'threes', name: '3', description: 'Somme des 3', calculate: () => 0, validValues: [0, 3, 6, 9, 12, 15] },
  { id: 'fours', name: '4', description: 'Somme des 4', calculate: () => 0, validValues: [0, 4, 8, 12, 16, 20] },
  { id: 'fives', name: '5', description: 'Somme des 5', calculate: () => 0, validValues: [0, 5, 10, 15, 20, 25] },
  { id: 'sixes', name: '6', description: 'Somme des 6', calculate: () => 0, validValues: [0, 6, 12, 18, 24, 30] },
  { id: 'three_of_kind', name: 'Brelan', description: 'Somme des dés (3 identiques)', calculate: () => 0, validValues: [0, 3, 6, 9, 12, 15, 18] },
  { id: 'four_of_kind', name: 'Carré', description: 'Somme des dés (4 identiques)', calculate: () => 0, validValues: [0, 4, 8, 12, 16, 20, 24] },
  { id: 'full_house', name: 'Full', description: '25 points (3+2 identiques)', calculate: () => 0, fixedScore: 25 },
  { id: 'small_straight', name: 'Petite suite', description: '30 points (4 consécutifs)', calculate: () => 0, fixedScore: 30 },
  { id: 'large_straight', name: 'Grande suite', description: '40 points (5 consécutifs)', calculate: () => 0, fixedScore: 40 },
  { id: 'yams', name: 'Yams', description: '50 points (5 identiques)', calculate: () => 0, fixedScore: 50 },
  { id: 'chance', name: 'Chance', description: 'Somme de tous les dés', calculate: () => 0, validValues: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
];

interface YamsScoreSheetProps {
  sessionId: string;
}

export default function YamsScoreSheet({ sessionId }: YamsScoreSheetProps) {
  const router = useRouter();
  
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentScores, setCurrentScores] = useState<{ [key: string]: { [playerId: number]: string } }>({});
  const [loading, setLoading] = useState(true);
  // Removed saving state - using optimistic updates for instant feedback
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/yams/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        
        const initialScores: { [key: string]: { [playerId: number]: string } } = {};
        YAMS_CATEGORIES.forEach(category => {
          initialScores[category.id] = {};
          data.session.players.forEach((player: Player) => {
            const existingScore = data.session.scores[category.id]?.[player.id];
            initialScores[category.id][player.id] = existingScore !== undefined ? existingScore.toString() : '';
          });
        });
        setCurrentScores(initialScores);
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
    fetchSession();
  }, [fetchSession]);

  const handleScoreChange = (categoryId: string, playerId: number, score: string) => {
    setCurrentScores(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [playerId]: score
      }
    }));
  };


  const saveScore = async (categoryId: string, playerId: number, fixedScore?: number) => {
    const score = fixedScore !== undefined ? fixedScore.toString() : currentScores[categoryId]?.[playerId];
    if (score === undefined || score === '') return;

    const scoreValue = parseInt(score) || 0;

    // 🚀 OPTIMISTIC UPDATE - Update UI immediately for instant feedback
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scores: {
          ...prev.scores,
          [categoryId]: {
            ...prev.scores[categoryId],
            [playerId]: scoreValue
          }
        }
      };
    });
    
    // Clear the input field immediately
    setCurrentScores(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [playerId]: ''
      }
    }));
    
    // Move to next player immediately
    if (session) {
      const playerIds = session.players.map(p => p.id);
      const currentIndex = playerIds.indexOf(playerId);
      if (currentIndex !== -1 && currentIndex < playerIds.length - 1) {
        setCurrentPlayerIndex(currentIndex + 1);
      } else {
        setCurrentPlayerIndex(0);
      }
    }

    // 🔄 ASYNC BACKGROUND SAVE - Fire and forget with error handling
    try {
      const response = await fetch(`/api/games/yams/sessions/${sessionId}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          playerId,
          score: scoreValue
        }),
      });

      if (!response.ok) {
        // 🚨 Revert optimistic update on error
        const data = await response.json();
        setSession(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            scores: {
              ...prev.scores,
              [categoryId]: {
                ...prev.scores[categoryId],
                [playerId]: undefined // Remove the failed score
              }
            }
          };
        });
        alert(data.error || 'Erreur lors de la sauvegarde - score annulé');
      }
      // ✅ Success - no action needed, optimistic update is already done
    } catch (error) {
      // 🚨 Network error - revert optimistic update
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          scores: {
            ...prev.scores,
            [categoryId]: {
              ...prev.scores[categoryId],
              [playerId]: undefined // Remove the failed score
            }
          }
        };
      });
      alert('Erreur de connexion - score annulé');
    }
  };

  const getTotalScore = (playerId: number) => {
    if (!session) return 0;
    
    let total = 0;
    let upperSectionTotal = 0;

    YAMS_CATEGORIES.forEach(category => {
      const score = session.scores[category.id]?.[playerId];
      const scoreValue = score !== undefined ? score : 0;
      total += scoreValue;
      
      if (['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].includes(category.id)) {
        upperSectionTotal += scoreValue;
      }
    });

    if (upperSectionTotal >= 63) {
      total += 35;
    }

    return total;
  };

  const getUpperSectionTotal = (playerId: number) => {
    if (!session) return 0;
    
    let total = 0;
    ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].forEach(categoryId => {
      const score = session.scores[categoryId]?.[playerId];
      total += score !== undefined ? score : 0;
    });
    return total;
  };

  const getPlayerRanking = () => {
    if (!session) return [];
    
    return session.players
      .map(player => ({
        ...player,
        totalScore: getTotalScore(player.id)
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
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
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Feuille de score Yams
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32 sm:w-48">
                          Catégorie
                        </th>
                        {session.players.map((player, index) => (
                          <th key={player.id} className={`px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                            index === currentPlayerIndex ? 'bg-green-50 dark:bg-green-900/20' : ''
                          }`}>
                            {player.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {YAMS_CATEGORIES.slice(0, 6).map((category) => (
                        <tr key={category.id}>
                          <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 sm:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                            <div className="flex flex-col sm:flex-row sm:items-center">
                              <span className="font-semibold">{category.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 sm:ml-2 leading-tight">
                                ({category.description})
                              </span>
                            </div>
                          </td>
                          {session.players.map((player, index) => {
                            const existingScore = session.scores[category.id]?.[player.id];
                            const isLocked = existingScore !== undefined;
                            
                            return (
                              <td key={player.id} className={`px-6 py-4 whitespace-nowrap text-center ${
                                index === currentPlayerIndex ? 'bg-green-50 dark:bg-green-900/20' : ''
                              }`}>
                                {isLocked ? (
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {existingScore}
                                  </span>
                                ) : (
                                  <ScoreInput
                                    value={currentScores[category.id]?.[player.id] || ''}
                                    onChange={(value) => handleScoreChange(category.id, player.id, value)}
                                    onSave={() => saveScore(category.id, player.id)}
                                    min={0}
                                    max={category.maxValue || 30}
                                    step={category.step || 1}
                                    validValues={category.validValues}
                                    size="md"
                                    showSaveButton={true}
                                    autoSaveOnButtons={false}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 px-3 sm:px-6 py-4 text-sm font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span>Sous-total</span>
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 sm:ml-2">
                              (1-6)
                            </span>
                          </div>
                        </td>
                        {session.players.map((player, index) => (
                          <td key={player.id} className={`px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-white ${
                            index === currentPlayerIndex ? 'bg-green-100 dark:bg-green-900/30' : ''
                          }`}>
                            {getUpperSectionTotal(player.id)}
                          </td>
                        ))}
                      </tr>
                      
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 px-3 sm:px-6 py-4 text-sm font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span>Bonus</span>
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 sm:ml-2">
                              (≥63: +35)
                            </span>
                          </div>
                        </td>
                        {session.players.map((player, index) => (
                          <td key={player.id} className={`px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-white ${
                            index === currentPlayerIndex ? 'bg-green-100 dark:bg-green-900/30' : ''
                          }`}>
                            {getUpperSectionTotal(player.id) >= 63 ? 35 : 0}
                          </td>
                        ))}
                      </tr>

                      {YAMS_CATEGORIES.slice(6).map((category) => (
                        <tr key={category.id}>
                          <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 sm:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                            <div className="flex flex-col sm:flex-row sm:items-center">
                              <span className="font-semibold">{category.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 sm:ml-2 leading-tight">
                                ({category.description})
                              </span>
                            </div>
                          </td>
                          {session.players.map((player, index) => {
                            const existingScore = session.scores[category.id]?.[player.id];
                            const isLocked = existingScore !== undefined;
                            
                            return (
                              <td key={player.id} className={`px-6 py-4 whitespace-nowrap text-center ${
                                index === currentPlayerIndex ? 'bg-green-50 dark:bg-green-900/20' : ''
                              }`}>
                                {isLocked ? (
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {existingScore}
                                  </span>
                                ) : (
                                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                                    {category.fixedScore ? (
                                      <>
                                        <input
                                          type="checkbox"
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              saveScore(category.id, player.id, category.fixedScore);
                                            }
                                          }}
                                          disabled={false}
                                          className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <button
                                          onClick={() => saveScore(category.id, player.id, 0)}
                                          disabled={false}
                                          className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                                          title="Rayer (0 points)"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <ScoreInput
                                        value={currentScores[category.id]?.[player.id] || ''}
                                        onChange={(value) => handleScoreChange(category.id, player.id, value)}
                                        onSave={() => saveScore(category.id, player.id)}
                                        min={0}
                                        max={category.maxValue || 30}
                                        step={category.step || 1}
                                        validValues={category.validValues}
                                        size="md"
                                        showSaveButton={true}
                                        autoSaveOnButtons={false}
                                      />
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      
                      <tr className="bg-green-100 dark:bg-green-900/30">
                        <td className="sticky left-0 z-10 bg-green-100 dark:bg-green-900/30 px-3 sm:px-6 py-4 text-sm font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                          TOTAL
                        </td>
                        {session.players.map((player, index) => (
                          <td key={player.id} className={`px-6 py-4 whitespace-nowrap text-center text-lg font-bold text-green-800 dark:text-green-200 ${
                            index === currentPlayerIndex ? 'bg-green-200 dark:bg-green-800/40' : ''
                          }`}>
                            {getTotalScore(player.id)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Classement
                </h3>
                
                {session.score_target && (
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Score à atteindre : <span className="font-semibold">{session.score_target} points</span>
                  </div>
                )}
                
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
                      <span className="text-sm text-gray-500 dark:text-gray-300">
                        {player.totalScore} pts
                      </span>
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