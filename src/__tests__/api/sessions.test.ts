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

// Mock database
const mockSessionResult = { lastInsertRowId: 123, rowsAffected: 1 };
const mockPlayerResult = { lastInsertRowId: 456, rowsAffected: 1 };

jest.mock('../../lib/database', () => ({
  db: {
    execute: jest.fn().mockImplementation((query: string | { sql: string; args: any[] }) => {
      const sql = typeof query === 'string' ? query : query.sql;
      
      if (sql.includes('SELECT * FROM games')) {
        return Promise.resolve({
          rows: [{
            id: 1,
            name: 'Yams (Yahtzee)',
            slug: 'yams',
            is_implemented: 1,
            team_based: 0,
            min_players: 1,
            max_players: 8,
            score_direction: 'higher'
          }]
        });
      }
      if (sql.includes('INSERT INTO game_sessions')) {
        return Promise.resolve(mockSessionResult);
      }
      if (sql.includes('INSERT INTO players')) {
        return Promise.resolve(mockPlayerResult);
      }
      if (sql.includes('INSERT INTO user_players')) {
        return Promise.resolve({ lastInsertRowId: 789, rowsAffected: 1 });
      }
      return Promise.resolve({ rows: [], lastInsertRowId: 0, rowsAffected: 0 });
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
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty('sessionId', 123);
      expect(data).toHaveProperty('message', 'Session créée avec succès');
    });

    it('should handle missing game', async () => {
      // Mock game not found
      const { db } = await import('../../lib/database');
      jest.mocked(db.execute).mockResolvedValueOnce({ rows: [] });

      const requestBody = {
        sessionName: 'Test Session',
        players: ['Alice'],
        hasScoreTarget: false,
        scoreTarget: null,
        finishCurrentRound: false
      };

      const request = new NextRequest('http://localhost:3000/api/games/nonexistent/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const mockParamsNotFound = Promise.resolve({ slug: 'nonexistent' });
      const response = await POST(request, { params: mockParamsNotFound });
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Jeu non trouvé');
    });

    it('should validate required fields', async () => {
      const requestBody = {
        // Missing sessionName
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
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should validate player count for team-based games', async () => {
      // Mock Belote (team-based game)
      const { db } = await import('../../lib/database');
      jest.mocked(db.execute).mockResolvedValueOnce({
        rows: [{
          id: 2,
          name: 'Belote',
          slug: 'belote',
          is_implemented: 1,
          team_based: 1,
          min_players: 4,
          max_players: 4,
          score_direction: 'higher'
        }]
      });

      const requestBody = {
        sessionName: 'Test Belote Session',
        players: ['Alice', 'Bob'], // Not enough players for Belote
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
      const { db } = await import('../../lib/database');
      jest.mocked(db.execute).mockRejectedValueOnce(new Error('Database connection failed'));

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