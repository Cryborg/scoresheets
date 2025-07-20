/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

describe('Auth utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAuthenticatedUserId', () => {
    it('should return userId from valid JWT token', () => {
      // Create a mock JWT payload
      const payload = { userId: 123, exp: Date.now() / 1000 + 3600 };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          Cookie: `auth-token=${mockToken}`
        }
      });

      const userId = getAuthenticatedUserId(request);
      expect(userId).toBe(123);
    });

    it('should return null when no token is present', () => {
      const request = new NextRequest('http://localhost:3000/test');
      
      const userId = getAuthenticatedUserId(request);
      expect(userId).toBeNull();
    });

    it('should return null when token is malformed', () => {
      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          Cookie: 'auth-token=invalid-token'
        }
      });

      const userId = getAuthenticatedUserId(request);
      expect(userId).toBeNull();
    });

    it('should return null when payload has no userId', () => {
      const payload = { exp: Date.now() / 1000 + 3600 }; // No userId
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          Cookie: `auth-token=${mockToken}`
        }
      });

      const userId = getAuthenticatedUserId(request);
      expect(userId).toBeNull();
    });

    it('should return null when payload is invalid JSON', () => {
      const invalidPayload = btoa('invalid-json');
      const mockToken = `header.${invalidPayload}.signature`;

      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          Cookie: `auth-token=${mockToken}`
        }
      });

      const userId = getAuthenticatedUserId(request);
      expect(userId).toBeNull();
    });
  });

  describe('unauthorizedResponse', () => {
    it('should return 401 response with error message', async () => {
      const response = unauthorizedResponse();
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toEqual({ error: 'Non autorisé' });
    });
  });
});