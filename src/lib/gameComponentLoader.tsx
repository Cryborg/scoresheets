import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

export interface ScoreSheetProps {
  sessionId: string;
}

interface GameInfo {
  slug: string;
  use_generic_scoring?: boolean;
}

const LoadingComponent = () => (
  <div className="text-center py-8">Chargement de la feuille de score...</div>
);

// Import générique pour les jeux simples
const GenericScoreSheet = dynamic(() => import('@/components/scoresheets/GenericScoreSheet'), {
  loading: LoadingComponent
});

// Composants spécifiques pour les jeux complexes (seul Yams nécessite un composant spécifique)
const specificComponents: Record<string, ComponentType<ScoreSheetProps>> = {
  'yams': dynamic(() => import('@/components/scoresheets/YamsScoreSheet'), {
    loading: LoadingComponent
  }),
};

/**
 * Détermine quel composant utiliser pour un jeu donné
 * Si le jeu a use_generic_scoring=true, utilise le composant générique
 * Sinon, cherche un composant spécifique, ou utilise le générique par défaut
 */
export function getGameComponent(gameInfo: GameInfo | string): ComponentType<ScoreSheetProps> | null {
  // Si c'est juste un slug string, on cherche d'abord dans les composants spécifiques
  if (typeof gameInfo === 'string') {
    return specificComponents[gameInfo] || GenericScoreSheet;
  }
  
  // Si on a l'info complète du jeu
  if (gameInfo.use_generic_scoring) {
    return GenericScoreSheet;
  }
  
  // Sinon on cherche un composant spécifique
  return specificComponents[gameInfo.slug] || GenericScoreSheet;
}