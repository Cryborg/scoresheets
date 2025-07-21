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

// Système de scoring du Bridge
const BRIDGE_SCORING = {
  // Points par levée supplémentaire selon l'atout
  trickPoints: {
    'clubs': 20,     // Trèfle
    'diamonds': 20,  // Carreau
    'hearts': 30,    // Cœur
    'spades': 30,    // Pique
    'notrump': 30    // Sans-atout (40 pour la première, 30 pour les suivantes)
  },
  // Primes de manche
  gameBonus: {
    nonVulnerable: 300,
    vulnerable: 500
  },
  // Primes de chelem
  slamBonus: {
    small: { nonVulnerable: 500, vulnerable: 750 },   // 12 levées
    grand: { nonVulnerable: 1000, vulnerable: 1500 }  // 13 levées
  },
  // Pénalités de chute
  undertricks: {
    nonVulnerable: {
      notDoubled: [50, 50, 50, 50, 50, 50, 50],      // -50 par levée
      doubled: [100, 200, 200, 300, 300, 300, 300],   // -100, -200, -200, -300...
      redoubled: [200, 400, 400, 600, 600, 600, 600]  // Double des pénalités doublées
    },
    vulnerable: {
      notDoubled: [100, 100, 100, 100, 100, 100, 100], // -100 par levée
      doubled: [200, 300, 300, 300, 300, 300, 300],    // -200, -300, -300...
      redoubled: [400, 600, 600, 600, 600, 600, 600]   // Double des pénalités doublées
    }
  }
};

interface BridgeContract {
  level: number;        // 1-7
  suit: string;         // clubs, diamonds, hearts, spades, notrump
  doubled: 'none' | 'doubled' | 'redoubled';
  declarer: string;     // N, S, E, W
  vulnerable: boolean;
}

interface BridgeScoreSheetProps {
  sessionId: string;
}

export default function BridgeScoreSheet({ sessionId }: BridgeScoreSheetProps) {
  const router = useRouter();
  
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRound, setMaxRound] = useState(1);
  
  // États pour la donne en cours
  const [contract, setContract] = useState<BridgeContract | null>(null);
  const [tricksMade, setTricksMade] = useState<string>('');
  const [honors, setHonors] = useState<number>(0); // Points d'honneurs
  
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/bridge/sessions/${sessionId}`);
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
    if (!contract || !session || !tricksMade) return null;
    
    const tricks = parseInt(tricksMade);
    const contractTricks = contract.level + 6; // Nombre de levées du contrat
    const overtricks = tricks - contractTricks;
    
    let score = 0;
    
    if (overtricks >= 0) {
      // Contrat réussi
      
      // Points de base
      if (contract.suit === 'notrump') {
        // Premier pli à 40, les suivants à 30
        score += 40 + (contract.level - 1) * 30;
      } else {
        score += contract.level * BRIDGE_SCORING.trickPoints[contract.suit];
      }
      
      // Doubler/Redoubler les points de base
      if (contract.doubled === 'doubled') score *= 2;
      if (contract.doubled === 'redoubled') score *= 4;
      
      // Prime de manche
      if (score >= 100) {
        score += contract.vulnerable ? BRIDGE_SCORING.gameBonus.vulnerable : BRIDGE_SCORING.gameBonus.nonVulnerable;
      } else {
        // Prime de partie partielle
        score += 50;
      }
      
      // Points pour les levées supplémentaires
      if (overtricks > 0) {
        if (contract.doubled === 'none') {
          score += overtricks * (contract.suit === 'notrump' ? 30 : BRIDGE_SCORING.trickPoints[contract.suit]);
        } else if (contract.doubled === 'doubled') {
          score += overtricks * (contract.vulnerable ? 200 : 100);
        } else { // redoubled
          score += overtricks * (contract.vulnerable ? 400 : 200);
        }
      }
      
      // Prime de chelem
      if (contract.level === 6) {
        score += contract.vulnerable ? BRIDGE_SCORING.slamBonus.small.vulnerable : BRIDGE_SCORING.slamBonus.small.nonVulnerable;
      } else if (contract.level === 7) {
        score += contract.vulnerable ? BRIDGE_SCORING.slamBonus.grand.vulnerable : BRIDGE_SCORING.slamBonus.grand.nonVulnerable;
      }
      
      // Prime pour contrat contré/surcontré réussi
      if (contract.doubled === 'doubled') score += 50;
      if (contract.doubled === 'redoubled') score += 100;
      
    } else {
      // Contrat chuté
      const undertricks = Math.abs(overtricks);
      const penalties = contract.vulnerable 
        ? BRIDGE_SCORING.undertricks.vulnerable
        : BRIDGE_SCORING.undertricks.nonVulnerable;
      
      const penaltyType = contract.doubled === 'redoubled' ? 'redoubled' 
        : contract.doubled === 'doubled' ? 'doubled' 
        : 'notDoubled';
      
      for (let i = 0; i < undertricks && i < penalties[penaltyType].length; i++) {
        score -= penalties[penaltyType][i];
      }
    }
    
    // Ajouter les points d'honneurs
    score += honors;
    
    return {
      baseScore: score,
      success: overtricks >= 0,
      overtricks,
      contractDescription: `${contract.level}${contract.suit === 'notrump' ? 'SA' : contract.suit[0].toUpperCase()}${
        contract.doubled === 'doubled' ? 'X' : contract.doubled === 'redoubled' ? 'XX' : ''
      } par ${contract.declarer}`
    };
  };

  const saveRound = async () => {
    if (!contract || !session || !tricksMade) return;
    
    const calculation = calculateScore();
    if (!calculation) return;
    
    // Au Bridge, les scores sont par équipe (NS vs EO)
    const scores: Array<{ playerId: number; score: number }> = [];
    
    // Déterminer quelle équipe a joué le contrat
    const declarerTeam = ['N', 'S'].includes(contract.declarer) ? 'NS' : 'EO';
    
    // Attribuer les scores
    session.players.forEach(player => {
      const playerPosition = player.position;
      const isNS = playerPosition === 0 || playerPosition === 2; // Positions 0 et 2 = N et S
      const playerTeam = isNS ? 'NS' : 'EO';
      
      // Le camp du déclarant marque les points, l'autre camp marque le négatif
      const score = playerTeam === declarerTeam ? calculation.baseScore : -calculation.baseScore;
      
      scores.push({
        playerId: player.id,
        score: score
      });
    });
    
    try {
      const response = await fetch(`/api/games/bridge/sessions/${sessionId}/rounds`, {
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
        
        // Réinitialiser le formulaire
        setContract(null);
        setTricksMade('');
        setHonors(0);
        
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

  const getTeamRanking = () => {
    if (!session) return [];
    
    // Calculer les scores par équipe
    const player2 = session.players[2];
    const player1 = session.players[1];
    const player3 = session.players[3];
    
    const nsScore = getTotalScore(session.players[0].id) + (player2 ? getTotalScore(player2.id) : 0);
    const eoScore = (player1 ? getTotalScore(player1.id) : 0) + (player3 ? getTotalScore(player3.id) : 0);
    
    return [
      { name: 'Nord-Sud', totalScore: nsScore / 2 },
      { name: 'Est-Ouest', totalScore: eoScore / 2 }
    ].sort((a, b) => b.totalScore - a.totalScore);
  };

  if (loading) {
    return <LoadingSpinner message={LOADING_MESSAGES.SCORESHEET} />;
  }

  if (!session) {
    return <LoadingSpinner message="Partie non trouvée" />;
  }

  const teamRanking = getTeamRanking();
  const calculation = calculateScore();

  return (
    <GameLayout 
      sessionName={session.session_name}
      sidebar={
        <RankingSidebar
          players={teamRanking}
          scoreTarget={session.score_target}
          hasScoreTarget={!!session.has_score_target}
        />
      }
    >
      <div className="space-y-6">
        {/* Navigation entre les donnes */}
        <GameCard title={`Donne ${currentRound}`}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentRound(Math.max(1, currentRound - 1))}
              disabled={currentRound <= 1}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentRound > maxRound ? 'Nouvelle donne' : `Donne ${currentRound} sur ${maxRound}`}
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
            // Affichage d'une donne existante
            <div className="space-y-4">
              <h3 className="font-semibold">Scores de la donne {currentRound}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Nord-Sud</h4>
                  {session.players.filter((_, i) => i === 0 || i === 2).map(player => (
                    <div key={player.id} className="flex justify-between">
                      <span>{player.name}</span>
                      <span className={`font-bold ${
                        (() => {
                          const score = session.scores[currentRound.toString()]?.[player.id];
                          return score !== undefined && score > 0;
                        })() 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {session.scores[currentRound.toString()]?.[player.id] || 0}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Est-Ouest</h4>
                  {session.players.filter((_, i) => i === 1 || i === 3).map(player => (
                    <div key={player.id} className="flex justify-between">
                      <span>{player.name}</span>
                      <span className={`font-bold ${
                        (() => {
                          const score = session.scores[currentRound.toString()]?.[player.id];
                          return score !== undefined && score > 0;
                        })() 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {session.scores[currentRound.toString()]?.[player.id] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Formulaire pour une nouvelle donne
            <div className="space-y-6">
              {/* Contrat */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Niveau</label>
                  <select
                    value={contract?.level || ''}
                    onChange={(e) => setContract({
                      ...contract!,
                      level: parseInt(e.target.value)
                    })}
                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="">-</option>
                    {[1, 2, 3, 4, 5, 6, 7].map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Couleur</label>
                  <select
                    value={contract?.suit || ''}
                    onChange={(e) => setContract({
                      ...contract!,
                      suit: e.target.value
                    })}
                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="">-</option>
                    <option value="clubs">♣ Trèfle</option>
                    <option value="diamonds">♦ Carreau</option>
                    <option value="hearts">♥ Cœur</option>
                    <option value="spades">♠ Pique</option>
                    <option value="notrump">SA (Sans atout)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Déclarant</label>
                  <select
                    value={contract?.declarer || ''}
                    onChange={(e) => setContract({
                      ...contract!,
                      declarer: e.target.value
                    })}
                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="">-</option>
                    <option value="N">Nord</option>
                    <option value="S">Sud</option>
                    <option value="E">Est</option>
                    <option value="W">Ouest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Contré</label>
                  <select
                    value={contract?.doubled || 'none'}
                    onChange={(e) => setContract({
                      ...contract!,
                      doubled: e.target.value as 'none' | 'doubled' | 'redoubled'
                    })}
                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="none">Non</option>
                    <option value="doubled">Contré (X)</option>
                    <option value="redoubled">Surcontré (XX)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={contract?.vulnerable || false}
                    onChange={(e) => setContract({
                      ...contract!,
                      vulnerable: e.target.checked
                    })}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span>Vulnérable</span>
                </label>
              </div>

              {/* Résultat */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Levées réalisées</label>
                  <input
                    type="number"
                    value={tricksMade}
                    onChange={(e) => setTricksMade(e.target.value)}
                    min="0"
                    max="13"
                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    placeholder="0-13"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Points d&apos;honneurs</label>
                  <input
                    type="number"
                    value={honors}
                    onChange={(e) => setHonors(parseInt(e.target.value) || 0)}
                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Aperçu du calcul */}
              {calculation && contract && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Aperçu du calcul</h4>
                  <div className="text-sm space-y-1">
                    <div>Contrat : {calculation.contractDescription}</div>
                    <div>
                      {calculation.success 
                        ? `Réussi${calculation.overtricks > 0 ? ` +${calculation.overtricks}` : ''}`
                        : `Chuté de ${Math.abs(calculation.overtricks)}`
                      }
                    </div>
                    <div className="font-bold pt-2">
                      Score : {calculation.baseScore > 0 ? '+' : ''}{calculation.baseScore}
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton de validation */}
              <button
                onClick={saveRound}
                disabled={!contract?.level || !contract?.suit || !contract?.declarer || !tricksMade}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Valider la donne
              </button>
            </div>
          )}
        </GameCard>

        {/* Tableau récapitulatif */}
        {maxRound > 0 && (
          <GameCard title="Récapitulatif">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Donne
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nord-Sud
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Est-Ouest
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {Array.from({ length: maxRound }, (_, i) => i + 1).map(round => {
                    const roundScores = session.scores[round.toString()] || {};
                    const nsScore = roundScores[session.players[0].id] || 0;
                    const player1 = session.players[1];
                    const eoScore = player1 ? (roundScores[player1.id] || 0) : 0;
                    return (
                      <tr key={round}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {round}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          <span className={nsScore > 0 ? 'text-green-600' : nsScore < 0 ? 'text-red-600' : ''}>
                            {nsScore > 0 ? '+' : ''}{nsScore}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          <span className={eoScore > 0 ? 'text-green-600' : eoScore < 0 ? 'text-red-600' : ''}>
                            {eoScore > 0 ? '+' : ''}{eoScore}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-green-100 dark:bg-green-900/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                      TOTAL
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-lg font-bold text-green-800 dark:text-green-200">
                      {teamRanking[0]?.name === 'Nord-Sud' ? teamRanking[0].totalScore : teamRanking[1]?.totalScore || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-lg font-bold text-green-800 dark:text-green-200">
                      {teamRanking[0]?.name === 'Est-Ouest' ? teamRanking[0].totalScore : teamRanking[1]?.totalScore || 0}
                    </td>
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