/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/games/[slug]/sessions/route';

// Mock authentication
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: jest.fn().mockReturnValue(1),
  unauthorizedResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
  )
}));

// Mock database
const mockSessionResult = { lastInsertRowid: 123, changes: 1 };
const mockPlayerResult = { lastInsertRowid: 456, changes: 1 };

jest.mock('@/lib/database-async', () => ({
  db: {
    prepare: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM games')) {
        return {
          get: jest.fn().mockResolvedValue({
            id: 1,
            name: 'Yams (Yahtzee)',
            slug: 'yams',
            is_implemented: true,
            team_based: false,
            min_players: 1,
            max_players: 8,
            score_direction: 'higher'
          })
        };
      }
      if (sql.includes('INSERT INTO game_sessions')) {
        return {
          run: jest.fn().mockResolvedValue(mockSessionResult)
        };
      }
      if (sql.includes('INSERT INTO players')) {
        return {
          run: jest.fn().mockResolvedValue(mockPlayerResult)
        };
      }
      if (sql.includes('INSERT INTO user_players')) {
        return {
          run: jest.fn().mockResolvedValue({ changes: 1 })
        };
      }
      return { get: jest.fn(), run: jest.fn(), all: jest.fn() };
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
    it('should create a session successfully', async () => {
      const requestBody = {
        sessionName: 'Test Session',
        players: ['Player 1', 'Player 2'],
        hasScoreTarget: false
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        }
      });

      const params = Promise.resolve({ slug: 'yams' });
      const response = await POST(request, { params });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Partie créée avec succès');
      expect(data).toHaveProperty('sessionId', mockSessionResult.lastInsertRowid);
    });

    it('should reject unauthenticated requests', async () => {
      const { getAuthenticatedUserId } = await import('@/lib/auth');
      jest.mocked(getAuthenticatedUserId).mockReturnValue(null);

      const requestBody = {
        sessionName: 'Test Session',
        players: ['Player 1', 'Player 2']
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const params = Promise.resolve({ slug: 'yams' });
      const response = await POST(request, { params });
      
      expect(response.status).toBe(401);
    });

    it('should reject invalid player count', async () => {
      const requestBody = {
        sessionName: 'Test Session',
        players: [], // Empty players array
        hasScoreTarget: false
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        }
      });

      const params = Promise.resolve({ slug: 'yams' });
      const response = await POST(request, { params });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Il faut entre');
    });

    it('should handle non-existent game', async () => {
      const { db } = await import('@/lib/database-async');
      jest.mocked(db.prepare).mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM games')) {
          return {
            get: jest.fn().mockResolvedValue(null)
          };
        }
        return { get: jest.fn(), run: jest.fn(), all: jest.fn() };
      });

      const requestBody = {
        sessionName: 'Test Session',
        players: ['Player 1', 'Player 2']
      };

      const request = new NextRequest('http://localhost:3000/api/games/nonexistent/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test-token'
        }
      });

      const params = Promise.resolve({ slug: 'nonexistent' });
      const response = await POST(request, { params });
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('Jeu non trouvé');
    });
  });
});