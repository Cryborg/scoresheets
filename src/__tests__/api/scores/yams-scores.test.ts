/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/games/[slug]/sessions/[sessionId]/scores/route';

// Mock database
jest.mock('../../../lib/database', () => ({
  db: {
    prepare: jest.fn().mockReturnValue({
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn()
    })
  }
}));

// Mock auth
jest.mock('../../../lib/auth', () => ({
  getAuthenticatedUserId: jest.fn(),
  unauthorizedResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
  )
}));

describe('/api/games/[slug]/sessions/[sessionId]/scores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST', () => {
    it('should save category score successfully', async () => {
      const { getAuthenticatedUserId } = await import('../../../lib/auth');
      const { db } = await import('../../../lib/database');
      
      jest.mocked(getAuthenticatedUserId).mockReturnValue(1);
      
      const mockPrepare = jest.mocked(db.prepare);
      const mockGet = jest.fn().mockReturnValue({ session_id: 1, existing_score_id: null });
      const mockRun = jest.fn().mockResolvedValue({ changes: 1 });
      
      mockPrepare.mockReturnValue({
        get: mockGet,
        run: mockRun,
        all: jest.fn()
      });

      const requestBody = {
        playerId: 1,
        categoryId: 'ones',
        score: 5
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions/123/scores', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { slug: 'yams', sessionId: '123' } });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Score enregistré');
    });

    it('should update existing score', async () => {
      const { getAuthenticatedUserId } = await import('../../../lib/auth');
      const { db } = await import('../../../lib/database');
      
      jest.mocked(getAuthenticatedUserId).mockReturnValue(1);
      
      const mockPrepare = jest.mocked(db.prepare);
      const mockGet = jest.fn().mockReturnValue({ session_id: 1, existing_score_id: 42 });
      const mockRun = jest.fn().mockResolvedValue({ changes: 1 });
      
      mockPrepare.mockReturnValue({
        get: mockGet,
        run: mockRun,
        all: jest.fn()
      });

      const requestBody = {
        playerId: 1,
        categoryId: 'ones',
        score: 10
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions/123/scores', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { slug: 'yams', sessionId: '123' } });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Score enregistré');
    });

    it('should return 404 for non-existent session', async () => {
      const { getAuthenticatedUserId } = await import('../../../lib/auth');
      const { db } = await import('../../../lib/database');
      
      jest.mocked(getAuthenticatedUserId).mockReturnValue(1);
      
      const mockPrepare = jest.mocked(db.prepare);
      const mockGet = jest.fn().mockReturnValue(null); // Session not found
      
      mockPrepare.mockReturnValue({
        get: mockGet,
        run: jest.fn(),
        all: jest.fn()
      });

      const requestBody = {
        playerId: 1,
        categoryId: 'ones',
        score: 5
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions/123/scores', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { slug: 'yams', sessionId: '123' } });

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Partie non trouvée');
    });

    it('should handle database errors gracefully', async () => {
      const { getAuthenticatedUserId } = await import('../../../lib/auth');
      const { db } = await import('../../../lib/database');
      
      jest.mocked(getAuthenticatedUserId).mockReturnValue(1);
      
      const mockPrepare = jest.mocked(db.prepare);
      const mockGet = jest.fn(() => {
        throw new Error('Database error');
      });
      
      mockPrepare.mockReturnValue({
        get: mockGet,
        run: jest.fn(),
        all: jest.fn()
      });

      const requestBody = {
        playerId: 1,
        categoryId: 'ones',
        score: 5
      };

      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions/123/scores', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { slug: 'yams', sessionId: '123' } });

      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Erreur serveur');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/games/yams/sessions/123/scores', {
        method: 'POST',
        body: 'invalid-json{',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: { slug: 'yams', sessionId: '123' } });

      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Erreur serveur');
    });
  });
});