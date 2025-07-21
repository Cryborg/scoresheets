/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../../app/api/games/[slug]/sessions/route';

// Mock auth 
jest.mock('../../lib/auth', () => ({
  getAuthenticatedUserId: jest.fn().mockReturnValue(1),
  unauthorizedResponse: jest.fn().mockReturnValue(new Response('Unauthorized', { status: 401 }))
}));

// Mock database avec interface better-sqlite3
const mockSessionResult = { lastInsertRowid: 123, changes: 1 };
const mockPlayerResult = { lastInsertRowid: 456, changes: 1 };

// Mock game data
const mockGame = {
  id: 1,
  name: 'Yams (Yahtzee)',
  slug: 'yams',
  is_implemented: 1,
  team_based: 0,
  min_players: 1,
  max_players: 8,
  score_direction: 'higher'
};

const mockBeloteGame = {
  id: 2,
  name: 'Belote',
  slug: 'belote',
  is_implemented: 1,
  team_based: 1,
  min_players: 4,
  max_players: 4,
  score_direction: 'higher'
};

jest.mock('../../lib/database', () => ({
  db: {
    prepare: jest.fn((sql: string) => {
      // Mock pour SELECT * FROM games WHERE slug = ?
      // @ts-expect-error - Mock SQL for testing, table resolution not needed
      if (sql.includes('SELECT * FROM games WHERE slug = ?')) {
        return {
          get: jest.fn((slug: string) => {
            if (slug === 'yams') return mockGame;
            if (slug === 'belote') return mockBeloteGame;
            if (slug === 'notfound') return undefined;
            return mockGame; // default
          })
        };
      }
      
      // Mock pour INSERT INTO game_sessions
      // @ts-expect-error - Mock SQL for testing
      if (sql.includes('INSERT INTO game_sessions')) {
        return {
          run: jest.fn().mockResolvedValue(mockSessionResult)
        };
      }
      
      // Mock pour INSERT INTO players
      // @ts-expect-error - Mock SQL for testing
      if (sql.includes('INSERT INTO players')) {
        return {
          run: jest.fn().mockResolvedValue(mockPlayerResult)
        };
      }
      
      // Mock pour INSERT INTO user_players
      // @ts-expect-error - Mock SQL for testing
      if (sql.includes('INSERT INTO user_players')) {
        return {
          run: jest.fn().mockResolvedValue({ lastInsertRowid: 789, changes: 1 })
        };
      }
      
      // Mock pour SELECT id FROM game_sessions (fallback)
      // @ts-expect-error - Mock SQL for testing
      if (sql.includes('SELECT id FROM game_sessions')) {
        return {
          get: jest.fn().mockReturnValue({ id: 123 })
        };
      }
      
      // Default mock
      return {
        get: jest.fn().mockReturnValue(undefined),
        run: jest.fn().mockResolvedValue({ lastInsertRowid: 0, changes: 0 }),
        all: jest.fn().mockReturnValue([])
      };
    })
  },
  initializeDatabase: jest.fn().mockResolvedValue(undefined)
}));

describe('/api/games/[slug]/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST', () => {
    const mockParams = Promise.resolve({ slug: 'yams' });

    it('should create a new game session successfully', async () => {
      const requestBody = {
        sessionName: 'Test Session',
        players: ['Alice', 'Bob'],
        hasScoreTarget: false,
        scoreTarget: null,
        finishCurrentRound: false
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request, { params: mockParams });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('sessionId', 123);
      expect(data).toHaveProperty('message', 'Partie créée avec succès');
    });

    it('should handle missing game', async () => {
      const requestBody = {
        sessionName: 'Test Session',
        players: ['Alice'],
        hasScoreTarget: false,
        scoreTarget: null,
        finishCurrentRound: false
      };

      const request = new NextRequest('http://localhost:3000/api/games/notfound/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const mockParamsNotFound = Promise.resolve({ slug: 'notfound' });
      const response = await POST(request, { params: mockParamsNotFound });
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Jeu non trouvé');
    });

    it('should validate required fields', async () => {
      const requestBody = {
        sessionName: 'Test Session',
        // Missing players array - should fail validation
        hasScoreTarget: false,
        scoreTarget: null,
        finishCurrentRound: false
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request, { params: mockParams });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Il faut entre 1 et 8 joueurs');
    });

    it('should validate player count for team-based games', async () => {
      const requestBody = {
        sessionName: 'Test Belote Session',
        players: ['Alice', 'Bob'], // Not enough players for Belote (needs 4)
        hasScoreTarget: false,
        scoreTarget: null,
        finishCurrentRound: false
      };

      const request = new NextRequest('http://localhost:3000/api/games/belote/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const mockParamsBelote = Promise.resolve({ slug: 'belote' });
      const response = await POST(request, { params: mockParamsBelote });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('4');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error by making prepare() throw
      const { db } = await import('../../lib/database');
      jest.mocked(db.prepare).mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const requestBody = {
        sessionName: 'Test Session',
        players: ['Alice'],
        hasScoreTarget: false,
        scoreTarget: null,
        finishCurrentRound: false
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request, { params: mockParams });
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Erreur serveur');
    });
  });
});