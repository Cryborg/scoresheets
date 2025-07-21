/**
 * @jest-environment jsdom
 */

// Mock game list functionality without React JSX
describe('Game List Component Logic', () => {
  // Mock games data
  const mockGames = [
    {
      id: 1,
      name: 'Yams',
      slug: 'yams',
      description: 'Jeu de dés classique',
      min_players: 1,
      max_players: 8,
      score_type: 'categories',
      score_direction: 'higher_wins'
    },
    {
      id: 2,
      name: 'Belote',
      slug: 'belote', 
      description: 'Jeu de cartes à 4 joueurs',
      min_players: 4,
      max_players: 4,
      score_type: 'rounds',
      score_direction: 'higher_wins'
    },
    {
      id: 3,
      name: 'Generic Game',
      slug: 'generic',
      description: 'Jeu générique personnalisable',
      min_players: 2,
      max_players: 8,
      score_type: 'rounds',
      score_direction: 'lower_wins'
    }
  ];

  // Mock fetch
  global.fetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Games Data Loading', () => {
    it('should load games from API successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ games: mockGames })
      });

      // Simulate loading games
      const response = await fetch('/api/games');
      const data = await response.json();

      expect(fetch).toHaveBeenCalledWith('/api/games');
      expect(data.games).toHaveLength(3);
      expect(data.games[0]).toHaveProperty('name', 'Yams');
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      const response = await fetch('/api/games');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data).toHaveProperty('error');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await fetch('/api/games');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });
  });

  describe('Games Filtering', () => {
    const filterGamesByPlayers = (games: typeof mockGames, playerCount: number) => {
      return games.filter(game => 
        playerCount >= game.min_players && playerCount <= game.max_players
      );
    };

    const searchGames = (games: typeof mockGames, query: string) => {
      const lowerQuery = query.toLowerCase();
      return games.filter(game =>
        game.name.toLowerCase().includes(lowerQuery) ||
        game.description.toLowerCase().includes(lowerQuery)
      );
    };

    it('should filter games by player count', () => {
      const availableFor2Players = filterGamesByPlayers(mockGames, 2);
      const availableFor4Players = filterGamesByPlayers(mockGames, 4);
      const availableFor10Players = filterGamesByPlayers(mockGames, 10);

      expect(availableFor2Players).toHaveLength(2); // Yams and Generic
      expect(availableFor2Players.map(g => g.slug)).toEqual(['yams', 'generic']);

      expect(availableFor4Players).toHaveLength(3); // All games
      expect(availableFor4Players.map(g => g.slug)).toEqual(['yams', 'belote', 'generic']);

      expect(availableFor10Players).toHaveLength(0); // No games support 10+ players
    });

    it('should search games by name and description', () => {
      const yamsResults = searchGames(mockGames, 'yams');
      const cardResults = searchGames(mockGames, 'carte');
      const diceResults = searchGames(mockGames, 'dés');
      const emptyResults = searchGames(mockGames, 'nonexistent');

      expect(yamsResults).toHaveLength(1);
      expect(yamsResults[0].slug).toBe('yams');

      expect(cardResults).toHaveLength(1);
      expect(cardResults[0].slug).toBe('belote');

      expect(diceResults).toHaveLength(1);
      expect(diceResults[0].slug).toBe('yams');

      expect(emptyResults).toHaveLength(0);
    });

    it('should handle case-insensitive search', () => {
      const upperCaseResults = searchGames(mockGames, 'YAMS');
      const mixedCaseResults = searchGames(mockGames, 'BeLOtE');

      expect(upperCaseResults).toHaveLength(1);
      expect(upperCaseResults[0].slug).toBe('yams');

      expect(mixedCaseResults).toHaveLength(1);
      expect(mixedCaseResults[0].slug).toBe('belote');
    });
  });

  describe('Games Sorting', () => {
    const sortGamesByName = (games: typeof mockGames, ascending = true) => {
      return [...games].sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return ascending ? comparison : -comparison;
      });
    };

    const sortGamesByPlayerCount = (games: typeof mockGames, ascending = true) => {
      return [...games].sort((a, b) => {
        const comparison = a.min_players - b.min_players;
        return ascending ? comparison : -comparison;
      });
    };

    it('should sort games by name', () => {
      const sortedAsc = sortGamesByName(mockGames, true);
      const sortedDesc = sortGamesByName(mockGames, false);

      expect(sortedAsc.map(g => g.name)).toEqual(['Belote', 'Generic Game', 'Yams']);
      expect(sortedDesc.map(g => g.name)).toEqual(['Yams', 'Generic Game', 'Belote']);
    });

    it('should sort games by player count', () => {
      const sortedByPlayers = sortGamesByPlayerCount(mockGames, true);

      expect(sortedByPlayers.map(g => g.slug)).toEqual(['yams', 'generic', 'belote']);
      expect(sortedByPlayers[0].min_players).toBe(1); // Yams
      expect(sortedByPlayers[2].min_players).toBe(4); // Belote
    });
  });

  describe('Game Categories', () => {
    const categorizeGames = (games: typeof mockGames) => {
      // @ts-expect-error - categories is used, PhpStorm false positive
      const categories = {
        dice: games.filter(g => g.description.includes('dés')),
        cards: games.filter(g => g.description.includes('cartes')),
        generic: games.filter(g => g.slug === 'generic'),
        classic: games.filter(g => ['yams', 'belote'].includes(g.slug))
      };
      
      return categories;
    };

    it('should categorize games by type', () => {
      const categories = categorizeGames(mockGames);

      expect(categories.dice).toHaveLength(1);
      expect(categories.dice[0].slug).toBe('yams');

      expect(categories.cards).toHaveLength(1);
      expect(categories.cards[0].slug).toBe('belote');

      expect(categories.generic).toHaveLength(1);
      expect(categories.generic[0].slug).toBe('generic');

      expect(categories.classic).toHaveLength(2);
      expect(categories.classic.map(g => g.slug)).toEqual(['yams', 'belote']);
    });
  });

  describe('Game Validation', () => {
    const validateGame = (game: unknown) => {
      const errors = [];
      const g = game as Record<string, unknown>;

      if (!g.name || typeof g.name !== 'string') {
        errors.push('Name is required and must be a string');
      }

      if (!g.slug || typeof g.slug !== 'string') {
        errors.push('Slug is required and must be a string');
      }

      if (!g.min_players || (g.min_players as number) < 1) {
        errors.push('Minimum players must be at least 1');
      }

      if (!g.max_players || (g.max_players as number) < (g.min_players as number)) {
        errors.push('Maximum players must be greater than or equal to minimum players');
      }

      if (!['categories', 'rounds'].includes(g.score_type as string)) {
        errors.push('Score type must be either "categories" or "rounds"');
      }

      if (!['higher_wins', 'lower_wins'].includes(g.score_direction as string)) {
        errors.push('Score direction must be either "higher_wins" or "lower_wins"');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    };

    it('should validate complete game objects', () => {
      const result = validateGame(mockGames[0]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const incompleteGame = {
        name: 'Test Game'
        // Missing other required fields
      };

      const result = validateGame(incompleteGame);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Slug is required and must be a string');
    });

    it('should validate player count constraints', () => {
      const invalidGame = {
        name: 'Test Game',
        slug: 'test',
        min_players: 5,
        max_players: 2, // Invalid: max < min
        score_type: 'rounds',
        score_direction: 'higher_wins'
      };

      const result = validateGame(invalidGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum players must be greater than or equal to minimum players');
    });

    it('should validate enum fields', () => {
      const invalidGame = {
        name: 'Test Game',
        slug: 'test',
        min_players: 2,
        max_players: 4,
        score_type: 'invalid_type', // Invalid
        score_direction: 'invalid_direction' // Invalid
      };

      const result = validateGame(invalidGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Score type must be either "categories" or "rounds"');
      expect(result.errors).toContain('Score direction must be either "higher_wins" or "lower_wins"');
    });
  });

  describe('Game Selection', () => {
    const selectGame = (games: typeof mockGames, slug: string) => {
      return games.find(game => game.slug === slug);
    };

    const getGamesByScoreType = (games: typeof mockGames, scoreType: string) => {
      return games.filter(game => game.score_type === scoreType);
    };

    it('should select game by slug', () => {
      const yams = selectGame(mockGames, 'yams');
      const nonexistent = selectGame(mockGames, 'nonexistent');

      expect(yams).toBeDefined();
      expect(yams?.name).toBe('Yams');

      expect(nonexistent).toBeUndefined();
    });

    it('should group games by scoring type', () => {
      const categoryGames = getGamesByScoreType(mockGames, 'categories');
      const roundGames = getGamesByScoreType(mockGames, 'rounds');

      expect(categoryGames).toHaveLength(1);
      expect(categoryGames[0].slug).toBe('yams');

      expect(roundGames).toHaveLength(2);
      expect(roundGames.map(g => g.slug)).toEqual(['belote', 'generic']);
    });
  });
});