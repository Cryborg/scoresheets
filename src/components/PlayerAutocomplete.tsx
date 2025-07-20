'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface Player {
  player_name: string;
  games_played: number;
  last_played: string;
}

interface PlayerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PlayerAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Nom du joueur",
  className = ""
}: PlayerAutocompleteProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const filtered = players.filter(p => 
        p.player_name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredPlayers(filtered);
    } else {
      setFilteredPlayers(players);
    }
  }, [value, players]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (playerName: string) => {
    onChange(playerName);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`${className} pr-8`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-gray-500">Chargement...</div>
          ) : filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => (
              <button
                key={player.player_name}
                type="button"
                onClick={() => handleSelect(player.player_name)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
              >
                <span>{player.player_name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {player.games_played} partie{player.games_played > 1 ? 's' : ''}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500">
              {value ? 'Aucun joueur trouvé' : 'Aucun joueur enregistré'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}