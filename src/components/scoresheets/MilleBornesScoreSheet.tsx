'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Car, Shield, AlertTriangle } from 'lucide-react';
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

// Système de scoring du Mille Bornes
const MILLE_BORNES_SCORING = {
  // Points de base pour finir la course
  completion: {
    first: 400,      // Premier à atteindre 1000 km
    others: 300      // Autres joueurs qui atteignent 1000 km
  },
  
  // Points par kilomètre parcouru
  distance: 1, // 1 point par km
  
  // Primes spéciales
  bonuses: {
    shutout: 500,           // Extension : adversaire à 0 km
    safeTrip: 300,          // Voyage sûr : aucune carte d'attaque
    allSafeties: 700,       // Les 4 bottes dans sa main
    handWin: 300,           // Coup fourré en main
    delayed: 300,           // Action retardée
    extension: 200,         // Prolongation (exactement 1000 km)
  },
  
  // Cartes bottes (immunité)
  safeties: {
    'as-du-volant': 100,      // Immunité contre Accident
    'citerne': 100,           // Immunité contre Panne d'essence
    'increvable': 100,        // Immunité contre Crèvason
    'prioritaire': 100        // Immunité contre Limitation + Feu rouge
  }
};

interface MilleBornesRound {
  playerId: number;
  kilometers: number;        // Distance parcourue (0-1000)
  safeties: string[];       // Bottes posées ['as-du-volant', 'citerne', ...]
  bonuses: string[];        // Primes obtenues ['safe-trip', 'shutout', ...]
  completed: boolean;       // A-t-il terminé la course ?
  winner: boolean;          // Premier à finir ?
}

interface MilleBornesScoreSheetProps {
  sessionId: string;
}

export default function MilleBornesScoreSheet({ sessionId }: MilleBornesScoreSheetProps) {
  const router = useRouter();
  
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRound, setMaxRound] = useState(1);
  
  // États pour la manche en cours
  const [roundData, setRoundData] = useState<{ [playerId: number]: MilleBornesRound }>({});
  
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/mille-bornes/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        
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
        
        // Initialiser les données de la nouvelle manche
        if (data.session.players) {
          const initialRoundData: { [playerId: number]: MilleBornesRound } = {};
          data.session.players.forEach((player: Player) => {
            initialRoundData[player.id] = {
              playerId: player.id,
              kilometers: 0,
              safeties: [],
              bonuses: [],
              completed: false,
              winner: false
            };
          });
          setRoundData(initialRoundData);
        }
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

  const updateRoundData = (playerId: number, field: keyof MilleBornesRound, value: string[] | number | boolean) => {
    setRoundData(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }));
  };

  const toggleSafety = (playerId: number, safety: string) => {
    const currentSafeties = roundData[playerId]?.safeties || [];
    const newSafeties = currentSafeties.includes(safety)
      ? currentSafeties.filter(s => s !== safety)
      : [...currentSafeties, safety];
    
    updateRoundData(playerId, 'safeties', newSafeties);
  };

  const toggleBonus = (playerId: number, bonus: string) => {
    const currentBonuses = roundData[playerId]?.bonuses || [];
    const newBonuses = currentBonuses.includes(bonus)
      ? currentBonuses.filter(b => b !== bonus)
      : [...currentBonuses, bonus];
    
    updateRoundData(playerId, 'bonuses', newBonuses);
  };

  const calculatePlayerScore = (playerData: MilleBornesRound) => {
    let score = 0;
    
    // Points par kilomètre
    score += playerData.kilometers * MILLE_BORNES_SCORING.distance;
    
    // Prime de fin de course
    if (playerData.completed) {
      score += playerData.winner 
        ? MILLE_BORNES_SCORING.completion.first 
        : MILLE_BORNES_SCORING.completion.others;
    }
    
    // Points des bottes
    playerData.safeties.forEach(safety => {
      score += MILLE_BORNES_SCORING.safeties[safety as keyof typeof MILLE_BORNES_SCORING.safeties] || 0;
    });
    
    // Primes spéciales
    playerData.bonuses.forEach(bonus => {
      score += MILLE_BORNES_SCORING.bonuses[bonus as keyof typeof MILLE_BORNES_SCORING.bonuses] || 0;
    });
    
    return score;
  };

  const saveRound = async () => {
    if (!session || !roundData) return;
    
    // Vérifier qu'au moins un joueur a des données
    const hasData = Object.values(roundData).some(data => 
      data.kilometers > 0 || data.safeties.length > 0 || data.bonuses.length > 0
    );
    
    if (!hasData) return;
    
    // Calculer les scores
    const scores: Array<{ playerId: number; score: number }> = [];
    
    Object.values(roundData).forEach(playerData => {
      const score = calculatePlayerScore(playerData);
      scores.push({
        playerId: playerData.playerId,
        score: score
      });
    });
    
    try {
      const response = await fetch(`/api/games/mille-bornes/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scores: scores
        }),
      });

      if (response.ok) {
        // Rafraîchir les données
        await fetchSession();
        
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
                      <div className="text-lg font-bold text-green-600">
                        {score !== undefined ? score : 0} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Formulaire pour une nouvelle manche
            <div className="space-y-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                🏁 Saisissez les résultats de la course pour chaque joueur
              </div>

              {session.players.map(player => (
                <div key={player.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold flex items-center">
                    <Car className="h-5 w-5 mr-2" />
                    {player.name}
                  </h4>

                  {/* Distance parcourue */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Distance parcourue (km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="25"
                      value={roundData[player.id]?.kilometers || 0}
                      onChange={(e) => updateRoundData(player.id, 'kilometers', parseInt(e.target.value) || 0)}
                      className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      placeholder="0"
                    />
                  </div>

                  {/* État de fin */}
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={roundData[player.id]?.completed || false}
                        onChange={(e) => updateRoundData(player.id, 'completed', e.target.checked)}
                        className="h-4 w-4 text-green-600"
                      />
                      <span className="text-sm">Course terminée (1000 km)</span>
                    </label>
                    
                    {roundData[player.id]?.completed && (
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={roundData[player.id]?.winner || false}
                          onChange={(e) => updateRoundData(player.id, 'winner', e.target.checked)}
                          className="h-4 w-4 text-yellow-600"
                        />
                        <span className="text-sm">Premier arrivé (+100 pts)</span>
                      </label>
                    )}
                  </div>

                  {/* Cartes bottes */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <Shield className="h-4 w-4 mr-1" />
                      Cartes bottes (+100 pts chacune)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(MILLE_BORNES_SCORING.safeties).map(([safety]) => (
                        <label key={safety} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={roundData[player.id]?.safeties.includes(safety) || false}
                            onChange={() => toggleSafety(player.id, safety)}
                            className="h-4 w-4 text-green-600"
                          />
                          <span className="text-sm capitalize">
                            {safety.replace('-', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Primes spéciales */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Primes spéciales
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={roundData[player.id]?.bonuses.includes('safe-trip') || false}
                          onChange={() => toggleBonus(player.id, 'safe-trip')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm">Voyage sûr (+300)</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={roundData[player.id]?.bonuses.includes('shutout') || false}
                          onChange={() => toggleBonus(player.id, 'shutout')}
                          className="h-4 w-4 text-red-600"
                        />
                        <span className="text-sm">Extension (+500)</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={roundData[player.id]?.bonuses.includes('all-safeties') || false}
                          onChange={() => toggleBonus(player.id, 'all-safeties')}
                          className="h-4 w-4 text-purple-600"
                        />
                        <span className="text-sm">4 bottes (+700)</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={roundData[player.id]?.bonuses.includes('coup-fourre') || false}
                          onChange={() => toggleBonus(player.id, 'coup-fourre')}
                          className="h-4 w-4 text-orange-600"
                        />
                        <span className="text-sm">Coup fourré (+300)</span>
                      </label>
                    </div>
                  </div>

                  {/* Aperçu du score */}
                  <div className="bg-white dark:bg-gray-600 p-3 rounded border-l-4 border-green-500">
                    <div className="font-semibold">
                      Score prévu: {calculatePlayerScore(roundData[player.id] || {
                        playerId: player.id,
                        kilometers: 0,
                        safeties: [],
                        bonuses: [],
                        completed: false,
                        winner: false
                      })} points
                    </div>
                  </div>
                </div>
              ))}

              {/* Bouton de validation */}
              <button
                onClick={saveRound}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                🏁 Valider la manche
              </button>
            </div>
          )}
        </GameCard>

        {/* Tableau récapitulatif */}
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
                          <td key={player.id} className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600">
                            {score !== undefined ? score : 0}
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