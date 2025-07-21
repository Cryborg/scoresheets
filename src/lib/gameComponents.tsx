import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Type for score sheet props
export interface ScoreSheetProps {
  sessionId: string;
}

// Loading component
const LoadingComponent = () => (
  <div className="text-center py-8">Chargement de la feuille de score...</div>
);

// Dynamic imports for all game components
const gameComponents: Record<string, ComponentType<ScoreSheetProps>> = {
  'yams': dynamic(() => import('@/components/scoresheets/YamsScoreSheet'), {
    loading: LoadingComponent
  }),
  'belote': dynamic(() => import('@/components/scoresheets/BeloteScoreSheet'), {
    loading: LoadingComponent
  }),
  // Tous les autres jeux utilisent maintenant le système générique
};

/**
 * Get a game component by slug
 */
export function getGameComponent(slug: string): ComponentType<ScoreSheetProps> | null {
  return gameComponents[slug] || null;
}