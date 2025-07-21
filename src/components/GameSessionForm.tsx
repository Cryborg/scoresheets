'use client';

import { 
  Users, 
  Target, 
  Play, 
  Plus,
  Settings,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import PlayerInput from './PlayerInput';
import GameSetupCard from './GameSetupCard';
import { Game, GameSessionCreatorState } from '@/hooks/useGameSessionCreator';

interface GameSessionFormProps {
  state: GameSessionCreatorState;
  game?: Game | null;
  onUpdateState: (updates: Partial<GameSessionCreatorState>) => void;
  onUpdatePlayer: (index: number, name: string) => void;
  onUpdateTeamPlayer: (teamIndex: number, playerIndex: number, name: string) => void;
  onAddPlayer: () => void;
  onRemovePlayer: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitButtonText?: string;
}

export default function GameSessionForm({
  state,
  game,
  onUpdateState,
  onUpdatePlayer,
  onUpdateTeamPlayer,
  onAddPlayer,
  onRemovePlayer,
  onSubmit,
  submitButtonText = "Créer la partie"
}: GameSessionFormProps) {
  
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Session Name */}
      <GameSetupCard
        title="Nom de la partie"
        description="Donnez un nom à votre partie (optionnel)"
        icon={Play}
      >
        <input
          type="text"
          value={state.sessionName}
          onChange={(e) => onUpdateState({ sessionName: e.target.value })}
          placeholder={game ? `Partie de ${game.name}` : "Partie avec scores simples"}
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md focus:shadow-lg"
        />
      </GameSetupCard>

      {/* Players Section */}
      <GameSetupCard
        title="Joueurs"
        description={game?.team_based 
          ? `Configuration des équipes (${game.min_players} joueurs requis)`
          : `Ajoutez entre ${game?.min_players || 2} et ${game?.max_players || 8} joueurs`
        }
        icon={Users}
      >
        {game?.team_based ? (
          <div className="space-y-6">
            {state.teams.map((team, teamIndex) => (
              <div key={teamIndex} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  {team.name}
                </h4>
                <div className="space-y-3">
                  {team.players.map((player, playerIndex) => (
                    <PlayerInput
                      key={`${teamIndex}-${playerIndex}`}
                      value={player}
                      onChange={(name) => onUpdateTeamPlayer(teamIndex, playerIndex, name)}
                      placeholder={`Joueur ${playerIndex + 1}`}
                      suggestions={state.suggestedPlayers}
                      autoFocus={teamIndex === 0 && playerIndex === 0}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {state.players.map((player, index) => (
              <PlayerInput
                key={index}
                value={player.name}
                onChange={(name) => onUpdatePlayer(index, name)}
                onRemove={game && state.players.length > game.min_players ? () => onRemovePlayer(index) : undefined}
                placeholder={`Joueur ${index + 1}`}
                suggestions={state.suggestedPlayers}
                canRemove={game ? state.players.length > game.min_players : state.players.length > 2}
                autoFocus={index === 0}
              />
            ))}
            
            {(!game || state.players.length < game.max_players) && (
              <button
                type="button"
                onClick={onAddPlayer}
                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter un joueur</span>
              </button>
            )}
          </div>
        )}
      </GameSetupCard>

      {/* Game Options */}
      <GameSetupCard
        title="Options de jeu"
        description="Configurez les règles de la partie"
        icon={Settings}
      >
        <div className="space-y-4">
          {/* Score Target */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="hasScoreTarget"
              checked={state.hasScoreTarget}
              onChange={(e) => onUpdateState({ hasScoreTarget: e.target.checked })}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="hasScoreTarget" className="text-sm font-medium text-gray-900 dark:text-white">
                Définir un score cible
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                La partie se termine quand un joueur atteint ce score
              </p>
              {state.hasScoreTarget && (
                <div className="mt-2 space-y-2">
                  <input
                    type="number"
                    value={state.scoreTarget}
                    onChange={(e) => onUpdateState({ scoreTarget: e.target.value })}
                    placeholder="Score cible (ex: 500)"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="finishCurrentRound"
                      checked={state.finishCurrentRound}
                      onChange={(e) => onUpdateState({ finishCurrentRound: e.target.checked })}
                      className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="finishCurrentRound" className="text-xs text-gray-600 dark:text-gray-400">
                      Terminer la manche en cours avant de déclarer le gagnant
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Score Direction (only for non-team games) */}
          {!game?.team_based && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Objectif de score
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onUpdateState({ scoreDirection: 'higher' })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    state.scoreDirection === 'higher'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Plus haut</div>
                  <div className="text-xs opacity-70">Le plus grand score gagne</div>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateState({ scoreDirection: 'lower' })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    state.scoreDirection === 'lower'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <TrendingDown className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Plus bas</div>
                  <div className="text-xs opacity-70">Le plus petit score gagne</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </GameSetupCard>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={state.loading}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {state.loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            Création...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Target className="h-5 w-5 mr-2" />
            {submitButtonText}
          </div>
        )}
      </button>
    </form>
  );
}