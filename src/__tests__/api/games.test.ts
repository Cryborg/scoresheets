/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../../app/api/games/route';

// Mock database
jest.mock('../../lib/database-async', () => ({
  db: {
    prepare: jest.fn().mockReturnValue({
      all: jest.fn().mockResolvedValue([
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
        }
      ])
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
      expect(data.games).toHaveLength(1);
      expect(data.games[0]).toMatchObject({
        id: 1,
        name: 'Yams (Yahtzee)',
        slug: 'yams',
        is_implemented: 1
      });
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('../../lib/database-async');
      jest.mocked(db.prepare).mockReturnValue({
        all: jest.fn().mockRejectedValue(new Error('Database error'))
      } as { all: jest.Mock });

      const response = await GET();
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Erreur serveur');
    });
  });
});