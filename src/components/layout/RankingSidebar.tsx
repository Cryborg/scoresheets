'use client';

import { Trophy } from 'lucide-react';

interface Player {
  id: number;
  name: string;
  totalScore: number;
}

interface RankingSidebarProps {
  players: Player[];
  scoreTarget?: number;
  hasScoreTarget?: boolean;
}

export default function RankingSidebar({ players, scoreTarget, hasScoreTarget }: RankingSidebarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
          Classement
        </h3>
        
        {hasScoreTarget && scoreTarget && scoreTarget > 0 ? (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Score à atteindre : <span className="font-semibold">{scoreTarget} points</span>
          </div>
        ) : null}
        
        <div className="space-y-3">
          {players.map((player, index) => (
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
              <div className="flex items-center">
                <span className="text-sm text-gray-500 dark:text-gray-300">
                  {player.totalScore} pts
                </span>
                {hasScoreTarget && scoreTarget && scoreTarget > 0 && player.totalScore >= scoreTarget ? (
                  <Trophy className="w-4 h-4 ml-2 text-yellow-500" />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}