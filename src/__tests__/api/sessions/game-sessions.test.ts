/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/games/[slug]/sessions/route';
import { GET as GetSession } from '../../../app/api/games/[slug]/sessions/[sessionId]/route';

// Mock database
jest.mock('../../../lib/database', () => ({
  db: {
    execute: jest.fn(),
    prepare: jest.fn().mockReturnValue({
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn()
    })
  },
  initializeDatabase: jest.fn().mockResolvedValue(undefined)
}));

// Mock auth
jest.mock('../../../lib/auth', () => ({
  getAuthenticatedUserId: jest.fn(),
  unauthorizedResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
  )
}));

const mockGame = {
  id: 1,
  name: 'Yams',
  slug: 'yams',
  is_implemented: 1,
  team_based: 0,
  min_players: 1,
  max_players: 8,
  score_direction: 'higher'
};

const mockSession = {
  id: 1,
  session_name: 'Test Game',
  game_id: 1,
  date_played: '2024-01-01T00:00:00.000Z',
  has_score_target: 0,
  score_target: null,
  finish_current_round: 0
};

const mockPlayers = [
  { id: 1, name: 'Player 1', position: 0 },
  { id: 2, name: 'Player 2', position: 1 }
];

describe('Game Session APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/games/[slug]/sessions', () => {
    it('should create new game session successfully', async () => {
      const { getAuthenticatedUserId } = await import('../../../lib/auth');
      const { db } = await import('../../../lib/database');
      
      jest.mocked(getAuthenticatedUserId).mockReturnValue(1);
      
      const mockPrepare = jest.mocked(db.prepare);
      const mockGet = jest.fn()
        .mockReturnValueOnce(mockGame) // Game lookup
        .mockReturnValueOnce({ id: 1 }); // Session ID retrieval
      const mockRun = jest.fn()
        .mockResolvedValueOnce({ lastInsertRowid: 1 }) // Session creation
        .mockResolvedValue({ changes: 1 }); // Player creation
      
      mockPrepare.mockReturnValue({
        get: mockGet,
        run: mockRun,
        all: jest.fn()
      });

      const requestBody = {
        players: ['Player 1', 'Player 2']
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: Promise.resolve({ slug: 'yams' }) });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('sessionId', 1);
      expect(data).toHaveProperty('message', 'Partie créée avec succès');
    });

    it('should handle game not found', async () => {
      const { getAuthenticatedUserId } = await import('../../../lib/auth');
      const { db } = await import('../../../lib/database');
      
      jest.mocked(getAuthenticatedUserId).mockReturnValue(1);
      
      const mockPrepare = jest.mocked(db.prepare);
      const mockGet = jest.fn().mockReturnValue(null); // No game found
      
      mockPrepare.mockReturnValue({
        get: mockGet,
        run: jest.fn(),
        all: jest.fn()
      });

      const requestBody = {
        players: ['Player 1', 'Player 2']
      };

      const request = new NextRequest('http://localhost:3000/api/games/invalid/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: Promise.resolve({ slug: 'invalid' }) });

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Jeu non trouvé');
    });
  });

  describe('GET /api/games/[slug]/sessions/[sessionId]', () => {
    it('should retrieve session with players and scores', async () => {
      const { getAuthenticatedUserId } = await import('../../../lib/auth');
      const { db } = await import('../../../lib/database');
      
      jest.mocked(getAuthenticatedUserId).mockReturnValue(1);
      
      const mockPrepare = jest.mocked(db.prepare);
      const mockGet = jest.fn()
        .mockReturnValueOnce(mockGame) // Game lookup
        .mockReturnValueOnce(mockSession); // Session lookup
      const mockAll = jest.fn().mockReturnValue(mockPlayers); // Players lookup
      
      mockPrepare.mockReturnValue({
        get: mockGet,
        run: jest.fn(),
        all: mockAll
      });

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions/1');

      const response = await GetSession(request, { params: Promise.resolve({ slug: 'yams', sessionId: '1' }) });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('session');
      expect(data.session).toHaveProperty('id', 1);
      expect(data.session).toHaveProperty('players');
      expect(data.session.players).toHaveLength(2);
    });

    it('should return 404 for non-existent session', async () => {
      const { getAuthenticatedUserId } = await import('../../../lib/auth');
      const { db } = await import('../../../lib/database');
      
      jest.mocked(getAuthenticatedUserId).mockReturnValue(1);
      
      const mockPrepare = jest.mocked(db.prepare);
      const mockGet = jest.fn()
        .mockReturnValueOnce(mockGame) // Game lookup
        .mockReturnValueOnce(null); // Session not found
      
      mockPrepare.mockReturnValue({
        get: mockGet,
        run: jest.fn(),
        all: jest.fn()
      });

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions/999');

      const response = await GetSession(request, { params: Promise.resolve({ slug: 'yams', sessionId: '999' }) });

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Partie non trouvée');
    });
  });
});