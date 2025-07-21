'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import GameLayout from '@/components/layout/GameLayout';
import GameCard from '@/components/layout/GameCard';
import RankingSidebar from '@/components/layout/RankingSidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { LOADING_MESSAGES } from '@/lib/constants';

interface Player {
  id: number;
  name: string;
  position: number;
}

interface GameSession {
  id: number;
  session_name: string;
  has_score_target: number;
  score_target?: number;
  finish_current_round: number;
  score_direction: string;
  players: Player[];
  scores: { [roundNumber: string]: { [playerId: number]: number | undefined } };
  rounds: Array<{
    round_number: number;
    scores: { [playerId: number]: number };
  }>;
}

interface TarotContract {
  value: string;
  label: string;
  basePoints: number;
  multiplier: number;
}

const TAROT_CONTRACTS: TarotContract[] = [
  { value: 'petite', label: 'Petite', basePoints: 25, multiplier: 1 },
  { value: 'garde', label: 'Garde', basePoints: 25, multiplier: 2 },
  { value: 'garde_sans', label: 'Garde sans', basePoints: 25, multiplier: 4 },
  { value: 'garde_contre', label: 'Garde contre', basePoints: 25, multiplier: 6 },
];

const BOUTS_OPTIONS = [
  { value: 0, label: '0 bout', pointsNeeded: 56 },
  { value: 1, label: '1 bout', pointsNeeded: 51 },
  { value: 2, label: '2 bouts', pointsNeeded: 41 },
  { value: 3, label: '3 bouts', pointsNeeded: 36 },
];

interface TarotScoreSheetProps {
  sessionId: string;
}

export default function TarotScoreSheet({ sessionId }: TarotScoreSheetProps) {
  const router = useRouter();
  
  console.log('[DEBUG TarotScoreSheet] SessionId:', sessionId);
  
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRound, setMaxRound] = useState(1);
  
  // États pour la manche en cours
  const [preneur, setPreneur] = useState<number | null>(null);
  const [contract, setContract] = useState<TarotContract | null>(null);
  const [bouts, setBouts] = useState<number>(0);
  const [points, setPoints] = useState<string>('');
  const [petitAuBout, setPetitAuBout] = useState<boolean>(false);
  const [poignee, setPoignee] = useState<string>('none');
  const [chelem, setChelem] = useState<string>('none');
  const [additionalScores, setAdditionalScores] = useState<{ [playerId: number]: number }>({});
  
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/tarot/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        
        // Adapter la structure des données pour le format du composant
        const adaptedSession = {
          ...data.session,
          scores: {}
        };
        
        // Convertir le format rounds en format scores par manche
        if (data.session.rounds) {
          data.session.rounds.forEach((round: { round_number: number; scores: { [playerId: number]: number } }) => {
            adaptedSession.scores[round.round_number.toString()] = round.scores;
          });
        }
        
        setSession(adaptedSession);
        
        // Déterminer le nombre maximum de manches
        const max = data.session.rounds ? data.session.rounds.length : 0;
        setMaxRound(max);
        setCurrentRound(max + 1); // Nouvelle manche
      } else if (response.status === 404) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const calculateScore = () => {
    if (!preneur || !contract || !session) return;
    
    const pointsNumber = parseInt(points) || 0;
    const boutsOption = BOUTS_OPTIONS.find(b => b.value === bouts);
    if (!boutsOption) return;
    
    const pointsNeeded = boutsOption.pointsNeeded;
    const difference = pointsNumber - pointsNeeded;
    const success = difference >= 0;
    
    // Calcul du score de base
    let baseScore = (contract.basePoints + Math.abs(difference)) * contract.multiplier;
    if (!success) baseScore = -baseScore;
    
    // Petit au bout (10 points multipliés par le multiplicateur du contrat)
    if (petitAuBout) {
      baseScore += (success ? 10 : -10) * contract.multiplier;
    }
    
    // Poignée
    let poigneeBonus = 0;
    if (poignee === 'simple') poigneeBonus = 20;
    else if (poignee === 'double') poigneeBonus = 30;
    else if (poignee === 'triple') poigneeBonus = 40;
    
    // Chelem
    let chelemBonus = 0;
    if (chelem === 'annonce_reussi') chelemBonus = 400;
    else if (chelem === 'annonce_chute') chelemBonus = -200;
    else if (chelem === 'non_annonce') chelemBonus = 200;
    
    return {
      baseScore,
      poigneeBonus,
      chelemBonus,
      totalForPreneur: baseScore + poigneeBonus + chelemBonus,
      success
    };
  };

  const saveRound = async () => {
    if (!preneur || !contract || !session || !points) return;
    
    const calculation = calculateScore();
    if (!calculation) return;
    
    const scores: { [playerId: number]: number } = {};
    
    // Calcul pour chaque joueur
    session.players.forEach(player => {
      if (player.id === preneur) {
        // Le preneur gagne ou perd 3 fois la mise + bonus/malus
        scores[player.id] = calculation.totalForPreneur * 3 + (additionalScores[player.id] || 0);
      } else {
        // Les défenseurs perdent ou gagnent la mise
        scores[player.id] = -calculation.totalForPreneur + (additionalScores[player.id] || 0);
      }
    });
    
    // Sauvegarder les scores
    try {
      // Convertir les scores au format attendu par l'API
      const scoresArray = Object.entries(scores).map(([playerId, score]) => ({
        playerId: parseInt(playerId),
        score: score
      }));
      
      const response = await fetch(`/api/games/tarot/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scores: scoresArray
        }),
      });

      if (response.ok) {
        // Rafraîchir les données
        await fetchSession();
        
        // Réinitialiser le formulaire
        setPreneur(null);
        setContract(null);
        setBouts(0);
        setPoints('');
        setPetitAuBout(false);
        setPoignee('none');
        setChelem('none');
        setAdditionalScores({});
        
        // Passer à la manche suivante
        setCurrentRound(currentRound + 1);
        setMaxRound(Math.max(maxRound, currentRound));
      }
    } catch (err) {
      console.error('Error saving round:', err);
    }
  };

  const getTotalScore = (playerId: number) => {
    if (!session) return 0;
    
    let total = 0;
    Object.entries(session.scores).forEach(([, playerScores]) => {
      const score = playerScores[playerId];
      if (score !== undefined) {
        total += score;
      }
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
    return <LoadingSpinner message={LOADING_MESSAGES.SCORESHEET} />;
  }

  if (!session) {
    return <LoadingSpinner message="Partie non trouvée" />;
  }

  const ranking = getPlayerRanking();
  const calculation = calculateScore();

  return (
    <GameLayout 
      sessionName={session.session_name}
      sidebar={
        <RankingSidebar
          players={ranking}
          scoreTarget={session.score_target}
          hasScoreTarget={!!session.has_score_target}
        />
      }
    >
      <div className="space-y-6">
        {/* Navigation entre les manches */}
        <GameCard title={`Manche ${currentRound}`}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentRound(Math.max(1, currentRound - 1))}
              disabled={currentRound <= 1}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentRound > maxRound ? 'Nouvelle manche' : `Manche ${currentRound} sur ${maxRound}`}
            </span>
            <button
              onClick={() => setCurrentRound(Math.min(maxRound + 1, currentRound + 1))}
              disabled={currentRound > maxRound}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {currentRound <= maxRound ? (
            // Affichage d'une manche existante
            <div className="space-y-4">
              <h3 className="font-semibold">Scores de la manche {currentRound}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {session.players.map(player => {
                  const score = session.scores[currentRound.toString()]?.[player.id];
                  return (
                    <div key={player.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="font-medium">{player.name}</div>
                      <div className={`text-lg font-bold ${
                        score !== undefined && score > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {score !== undefined ? (score > 0 ? '+' : '') + score : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Formulaire pour une nouvelle manche
            <div className="space-y-6">
              {/* Sélection du preneur */}
              <div>
                <label className="block text-sm font-medium mb-2">Preneur</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {session.players.map(player => (
                    <button
                      key={player.id}
                      onClick={() => setPreneur(player.id)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        preneur === player.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contrat */}
              <div>
                <label className="block text-sm font-medium mb-2">Contrat</label>
                <div className="grid grid-cols-2 gap-2">
                  {TAROT_CONTRACTS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setContract(c)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        contract?.value === c.value
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bouts */}
              <div>
                <label className="block text-sm font-medium mb-2">Nombre de bouts</label>
                <div className="grid grid-cols-4 gap-2">
                  {BOUTS_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setBouts(option.value)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        bouts === option.value
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className="text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.pointsNeeded} pts</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Points réalisés */}
              <div>
                <label className="block text-sm font-medium mb-2">Points réalisés par l&apos;attaque</label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  min="0"
                  max="91"
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  placeholder="0-91"
                />
              </div>

              {/* Options additionnelles */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={petitAuBout}
                    onChange={(e) => setPetitAuBout(e.target.checked)}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span>Petit au bout</span>
                </label>

                <div>
                  <label className="block text-sm font-medium mb-2">Poignée</label>
                  <select
                    value={poignee}
                    onChange={(e) => setPoignee(e.target.value)}
                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="none">Aucune</option>
                    <option value="simple">Simple (10 atouts)</option>
                    <option value="double">Double (13 atouts)</option>
                    <option value="triple">Triple (15 atouts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Chelem</label>
                  <select
                    value={chelem}
                    onChange={(e) => setChelem(e.target.value)}
                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="none">Aucun</option>
                    <option value="annonce_reussi">Annoncé et réussi (+400)</option>
                    <option value="annonce_chute">Annoncé et chuté (-200)</option>
                    <option value="non_annonce">Non annoncé (+200)</option>
                  </select>
                </div>
              </div>

              {/* Scores additionnels */}
              <div>
                <label className="block text-sm font-medium mb-2">Scores additionnels (ex: misère)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {session.players.map(player => (
                    <div key={player.id} className="flex items-center space-x-2">
                      <span className="text-sm">{player.name}:</span>
                      <input
                        type="number"
                        value={additionalScores[player.id] || ''}
                        onChange={(e) => setAdditionalScores({
                          ...additionalScores,
                          [player.id]: parseInt(e.target.value) || 0
                        })}
                        className="w-20 p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Aperçu du calcul */}
              {calculation && preneur && contract && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Aperçu du calcul</h4>
                  <div className="text-sm space-y-1">
                    <div>Contrat {calculation.success ? 'réussi' : 'chuté'}</div>
                    <div>Score de base: {calculation.baseScore}</div>
                    {calculation.poigneeBonus > 0 && <div>Poignée: +{calculation.poigneeBonus}</div>}
                    {calculation.chelemBonus !== 0 && <div>Chelem: {calculation.chelemBonus > 0 ? '+' : ''}{calculation.chelemBonus}</div>}
                    <div className="font-bold pt-2">
                      Score du preneur: {calculation.totalForPreneur * 3}
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton de validation */}
              <button
                onClick={saveRound}
                disabled={!preneur || !contract || !points}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Valider la manche
              </button>
            </div>
          )}
        </GameCard>

        {/* Historique des manches */}
        {maxRound > 0 && (
          <GameCard title="Historique des manches">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Manche
                    </th>
                    {session.players.map(player => (
                      <th key={player.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {player.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {Array.from({ length: maxRound }, (_, i) => i + 1).map(round => (
                    <tr key={round}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {round}
                      </td>
                      {session.players.map(player => {
                        const score = session.scores[round.toString()]?.[player.id];
                        return (
                          <td key={player.id} className="px-6 py-4 whitespace-nowrap text-center text-sm">
                            <span className={score !== undefined && score > 0 ? 'text-green-600' : 'text-red-600'}>
                              {score !== undefined ? (score > 0 ? '+' : '') + score : '-'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-green-100 dark:bg-green-900/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                      TOTAL
                    </td>
                    {session.players.map(player => (
                      <td key={player.id} className="px-6 py-4 whitespace-nowrap text-center text-lg font-bold text-green-800 dark:text-green-200">
                        {getTotalScore(player.id)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </GameCard>
        )}
      </div>
    </GameLayout>
  );
}