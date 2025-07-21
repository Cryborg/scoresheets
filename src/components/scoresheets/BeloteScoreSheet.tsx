'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Crown, Target } from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';

interface Player {
  id: number;
  name: string;
  position: number;
}

interface Team {
  players: Player[];
  totalScore: number;
  name: string;
}

interface GameSession {
  id: number;
  session_name: string;
  score_target?: number;
  players: Player[];
  rounds: Round[];
}

interface Round {
  round_number: number;
  scores: { [playerId: number]: number };
  team_scores: { [teamIndex: number]: number };
  details?: {
    trump?: string;
    taker_team?: number;
    contract?: string;
    made?: boolean;
    belote_rebelote?: number;
  };
}

interface BeloteScoreSheetProps {
  sessionId: string;
}

// Couleurs et contrats de la belote
const TRUMP_SUITS = [
  { value: 'spades', label: '♠️ Pique', color: 'text-black' },
  { value: 'hearts', label: '♥️ Cœur', color: 'text-red-500' },
  { value: 'diamonds', label: '♦️ Carreau', color: 'text-red-500' },
  { value: 'clubs', label: '♣️ Trèfle', color: 'text-black' },
  { value: 'all-trump', label: '🌟 Tout atout', color: 'text-blue-600' },
  { value: 'no-trump', label: '🚫 Sans atout', color: 'text-gray-600' }
];


export default function BeloteScoreSheet({ sessionId }: BeloteScoreSheetProps) {
  const router = useRouter();
  
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [newRound, setNewRound] = useState({
    trump: '',
    taker_team: 0,
    contract: 80,
    team1_score: '',
    team2_score: '',
    belote_rebelote: 0,
    made: true
  });
  const [showNewRound, setShowNewRound] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/api/games/belote/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        
        // Organiser les joueurs en équipes (positions 0,2 vs 1,3)
        const players = data.session.players;
        const team1: Team = {
          players: [players[0], players[2]],
          totalScore: 0,
          name: `${players[0]?.name || 'Joueur 1'} & ${players[2]?.name || 'Joueur 3'}`
        };
        const team2: Team = {
          players: [players[1], players[3]],
          totalScore: 0,
          name: `${players[1]?.name || 'Joueur 2'} & ${players[4]?.name || 'Joueur 4'}`
        };

        // Calculer les scores totaux
        (data.session.rounds || []).forEach((round: Round) => {
          team1.totalScore += round.team_scores[0] || 0;
          team2.totalScore += round.team_scores[1] || 0;
        });

        setTeams([team1, team2]);
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

  const addRound = async () => {
    if (!session || newRound.team1_score === '' || newRound.team2_score === '') return;

    const team1Score = parseInt(newRound.team1_score) || 0;
    const team2Score = parseInt(newRound.team2_score) || 0;
    
    // Validation des scores (total doit être proche de 162 + belote/rebelote)
    const totalPoints = team1Score + team2Score + newRound.belote_rebelote;
    if (totalPoints !== 162 && totalPoints !== 182) { // 162 normal, 182 avec belote/rebelote
      if (!confirm(`Le total des points (${totalPoints}) ne correspond pas aux 162 points habituels. Continuer ?`)) {
        return;
      }
    }

    try {
      const response = await authenticatedFetch(`/api/games/belote/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          round_number: (session.rounds?.length || 0) + 1,
          team_scores: {
            0: team1Score,
            1: team2Score
          },
          details: {
            trump: newRound.trump,
            taker_team: newRound.taker_team,
            contract: newRound.contract,
            made: newRound.made,
            belote_rebelote: newRound.belote_rebelote
          }
        }),
      });

      if (response.ok) {
        // Reset form
        setNewRound({
          trump: '',
          taker_team: 0,
          contract: 80,
          team1_score: '',
          team2_score: '',
          belote_rebelote: 0,
          made: true
        });
        setShowNewRound(false);
        fetchSession(); // Refresh data
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l&apos;ajout du tour');
      }
    } catch (error) {
      console.error('Error adding round:', error);
      alert('Erreur de connexion');
    }
  };

  const getWinningTeam = () => {
    if (!session?.score_target) return null;
    const targetScore = session.score_target;
    
    const team1 = teams[0];
    const team2 = teams[1];
    
    if (team1?.totalScore >= targetScore) return { team: team1, index: 0 };
    if (team2?.totalScore >= targetScore) return { team: team2, index: 1 };
    return null;
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

  const winner = getWinningTeam();

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Feuille de score Belote
                  </h3>
                  <button
                    onClick={() => setShowNewRound(!showNewRound)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    + Nouveau tour
                  </button>
                </div>

                {/* Équipes */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {teams.map((team, index) => (
                    <div key={index} className={`p-4 rounded-lg border-2 ${
                      winner?.index === index 
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Équipe {index + 1}
                        </h4>
                        {winner?.index === index && (
                          <Crown className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {team.name}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {team.totalScore} pts
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulaire nouveau tour */}
                {showNewRound && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Nouveau tour</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Atout
                        </label>
                        <select
                          value={newRound.trump}
                          onChange={(e) => setNewRound(prev => ({ ...prev, trump: e.target.value }))}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="">Choisir l&apos;atout</option>
                          {TRUMP_SUITS.map(suit => (
                            <option key={suit.value} value={suit.value}>
                              {suit.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Équipe preneuse
                        </label>
                        <select
                          value={newRound.taker_team}
                          onChange={(e) => setNewRound(prev => ({ ...prev, taker_team: parseInt(e.target.value) }))}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value={0}>Équipe 1</option>
                          <option value={1}>Équipe 2</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Score Équipe 1
                        </label>
                        <input
                          type="number"
                          value={newRound.team1_score}
                          onChange={(e) => setNewRound(prev => ({ ...prev, team1_score: e.target.value }))}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Score Équipe 2
                        </label>
                        <input
                          type="number"
                          value={newRound.team2_score}
                          onChange={(e) => setNewRound(prev => ({ ...prev, team2_score: e.target.value }))}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Belote/Rebelote
                        </label>
                        <select
                          value={newRound.belote_rebelote}
                          onChange={(e) => setNewRound(prev => ({ ...prev, belote_rebelote: parseInt(e.target.value) }))}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value={0}>Aucune</option>
                          <option value={20}>20 points</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex space-x-3 mt-4">
                      <button
                        onClick={addRound}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Ajouter le tour
                      </button>
                      <button
                        onClick={() => setShowNewRound(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Historique des tours */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tour
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Atout
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Équipe 1
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Équipe 2
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total 1
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total 2
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {session.rounds?.map((round, index) => {
                        let team1RunningTotal = 0;
                        let team2RunningTotal = 0;
                        
                        // Calculer le total cumulé jusqu'à ce tour
                        session.rounds?.slice(0, index + 1).forEach(r => {
                          team1RunningTotal += r.team_scores[0] || 0;
                          team2RunningTotal += r.team_scores[1] || 0;
                        });

                        const trumpSuit = TRUMP_SUITS.find(s => s.value === round.details?.trump);
                        
                        return (
                          <tr key={round.round_number}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {round.round_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <span className={trumpSuit?.color}>
                                {trumpSuit?.label || '❓'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                              {round.team_scores[0] || 0}
                              {round.details?.belote_rebelote && round.details.taker_team === 0 && (
                                <span className="text-blue-600 ml-1">+{round.details.belote_rebelote}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                              {round.team_scores[1] || 0}
                              {round.details?.belote_rebelote && round.details.taker_team === 1 && (
                                <span className="text-blue-600 ml-1">+{round.details.belote_rebelote}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-white">
                              {team1RunningTotal}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-white">
                              {team2RunningTotal}
                            </td>
                          </tr>
                        );
                      })}
                      {(!session.rounds || session.rounds.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            Aucun tour joué pour le moment
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Panneau latéral */}
          <div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Objectif
                </h3>
                
                {session.score_target && (
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>Score à atteindre : <span className="font-semibold">{session.score_target} points</span></span>
                    </div>
                  </div>
                )}

                {winner && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                      <Crown className="h-5 w-5" />
                      <span className="font-medium">Victoire !</span>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      {winner.team.name} remporte la partie avec {winner.team.totalScore} points !
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Règles rappel :</strong>
                  </div>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li>• 162 points par donne (+ 20 pour Belote/Rebelote)</li>
                    <li>• Première équipe à {session.score_target || 501} points gagne</li>
                    <li>• L&apos;équipe preneuse doit faire au moins la moitié des points</li>
                    <li>• Si elle chute, l&apos;autre équipe prend tous les points</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}