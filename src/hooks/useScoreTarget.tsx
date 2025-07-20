import React from 'react';

interface Session {
  has_score_target?: boolean;
  score_target?: number | null;
  finish_current_round?: boolean;
}

interface Player {
  id: number;
  name: string;
}

/**
 * Hook pour gérer la logique des scores cibles de manière cohérente
 */
export function useScoreTarget(session: Session | null) {
  /**
   * Vérifie si le système de score cible est activé ET qu'il y a un score cible valide (> 0)
   */
  const hasValidScoreTarget = () => {
    return Boolean(session?.has_score_target && session?.score_target && session.score_target > 0);
  };

  /**
   * Vérifie si un joueur a atteint le score cible
   */
  const hasReachedTarget = (playerScore: number) => {
    if (!hasValidScoreTarget() || !session?.score_target) return false;
    return playerScore >= session.score_target;
  };

  /**
   * Vérifie si au moins un joueur a atteint le score cible
   */
  const someoneReachedTarget = (players: Player[], getTotalScore: (playerId: number, upToRound?: number) => number, upToRound?: number) => {
    if (!hasValidScoreTarget()) return false;
    return players.some(player => hasReachedTarget(getTotalScore(player.id, upToRound)));
  };

  /**
   * Composant pour afficher les informations du score cible (null si pas de score cible valide)
   */
  const ScoreTargetInfo = hasValidScoreTarget() ? (
    <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
      Score à atteindre : <span className="font-semibold">{session!.score_target} points</span>
    </div>
  ) : null;

  /**
   * Retourne true si le joueur doit afficher un trophée
   */
  const shouldShowTrophy = (playerScore: number) => {
    return hasReachedTarget(playerScore);
  };

  return {
    hasValidScoreTarget,
    hasReachedTarget,
    someoneReachedTarget,
    ScoreTargetInfo,
    shouldShowTrophy,
    scoreTarget: session?.score_target || 0
  };
}