import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

export interface ScoreSheetProps {
  sessionId: string;
}

interface GameInfo {
  slug: string;
  score_type?: string;
}

const LoadingComponent = () => (
  <div className="text-center py-8">Chargement de la feuille de score...</div>
);

// Import générique pour les jeux simples
const GenericScoreSheet = dynamic(() => import('@/components/scoresheets/GenericScoreSheet'), {
  loading: LoadingComponent
});

// Composants spécifiques pour les jeux complexes
const specificComponents: Record<string, ComponentType<ScoreSheetProps>> = {
  'yams': dynamic(() => import('@/components/scoresheets/YamsScoreSheet'), {
    loading: LoadingComponent
  }),
  'belote': dynamic(() => import('@/components/scoresheets/BeloteScoreSheet'), {
    loading: LoadingComponent
  }),
  'tarot': dynamic(() => import('@/components/scoresheets/TarotScoreSheet'), {
    loading: LoadingComponent
  }),
  'bridge': dynamic(() => import('@/components/scoresheets/BridgeScoreSheet'), {
    loading: LoadingComponent
  }),
  'mille-bornes': dynamic(() => import('@/components/scoresheets/MilleBornesScoreSheet'), {
    loading: LoadingComponent
  }),
};

/**
 * Détermine quel composant utiliser pour un jeu donné
 * Utilise un composant spécifique si disponible, sinon le composant générique
 */
export function getGameComponent(gameInfo: GameInfo | string): ComponentType<ScoreSheetProps> | null {
  // Si c'est juste un slug string, on cherche d'abord dans les composants spécifiques
  if (typeof gameInfo === 'string') {
    return specificComponents[gameInfo] || GenericScoreSheet;
  }
  
  // Sinon on cherche un composant spécifique basé sur le slug
  return specificComponents[gameInfo.slug] || GenericScoreSheet;
}