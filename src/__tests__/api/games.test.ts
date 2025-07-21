/**
 * @jest-environment node
 */

// import { NextRequest } from 'next/server'; // May be used in future tests
import { GET } from '../../app/api/games/route';

// Mock database
jest.mock('../../lib/database', () => ({
  db: {
    execute: jest.fn().mockResolvedValue({
      rows: [
        {
          id: 1,
          name: 'Yams (Yahtzee)',
          slug: 'yams',
          rules: 'Test rules',
          is_implemented: 1,
          score_type: 'categories',
          team_based: 0,
          min_players: 1,
          max_players: 8,
          score_direction: 'higher',
          category_name: 'Jeux de dés'
        },
        {
          id: 2,
          name: 'Belote',
          slug: 'belote',
          rules: 'Test rules for Belote',
          is_implemented: 1,
          score_type: 'rounds',
          team_based: 1,
          min_players: 4,
          max_players: 4,
          score_direction: 'higher',
          category_name: 'Jeux de cartes'
        }
      ]
    })
  },
  initializeDatabase: jest.fn().mockResolvedValue(undefined)
}));

describe('/api/games', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    it('should return games successfully', async () => {
      const response = await GET();
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('games');
      expect(Array.isArray(data.games)).toBe(true);
      expect(data.games).toHaveLength(2);
      
      // Check for Yams game
      const yamsGame = data.games.find(g => g.slug === 'yams');
      expect(yamsGame).toMatchObject({
        id: 1,
        name: 'Yams (Yahtzee)',
        slug: 'yams',
        is_implemented: 1
      });
      
      // Check for Belote game
      const beloteGame = data.games.find(g => g.slug === 'belote');
      expect(beloteGame).toMatchObject({
        id: 2,
        name: 'Belote',
        slug: 'belote',
        is_implemented: 1
      });
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('../../lib/database');
      jest.mocked(db.execute).mockRejectedValue(new Error('Database error'));

      const response = await GET();
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Erreur serveur');
    });
  });
});