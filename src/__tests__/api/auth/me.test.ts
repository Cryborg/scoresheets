/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../../../app/api/auth/me/route';

// Mock auth-db
jest.mock('../../../lib/auth-db', () => ({
  getUserByEmail: jest.fn()
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_admin: false
};

const mockAdminUser = {
  id: 2,
  username: 'admin',
  email: 'admin@example.com',
  is_admin: true
};

describe('/api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    it('should return user info for valid authenticated user', async () => {
      const jwt = await import('jsonwebtoken');
      const { getUserByEmail } = await import('../../../lib/auth-db');
      
      jest.mocked(jwt.verify).mockReturnValue({ email: 'test@example.com', id: 1 } as unknown);
      jest.mocked(getUserByEmail).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          'Cookie': 'auth-token=valid-jwt-token'
        }
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id', 1);
      expect(data.user).toHaveProperty('email', 'test@example.com');
      expect(data.user).toHaveProperty('username', 'testuser');
      expect(data.user).toHaveProperty('is_admin', false);
      expect(data.user).not.toHaveProperty('password_hash');
    });

    it('should return admin user info correctly', async () => {
      const jwt = await import('jsonwebtoken');
      const { getUserByEmail } = await import('../../../lib/auth-db');
      
      jest.mocked(jwt.verify).mockReturnValue({ email: 'admin@example.com', id: 2 } as unknown);
      jest.mocked(getUserByEmail).mockResolvedValue(mockAdminUser);

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: { 'Cookie': 'auth-token=admin-jwt-token' }
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.user).toHaveProperty('is_admin', true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me');

      const response = await GET(request);

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Non authentifié');
    });

    it('should return 401 when user not found in database', async () => {
      const jwt = await import('jsonwebtoken');
      const { getUserByEmail } = await import('../../../lib/auth-db');
      
      jest.mocked(jwt.verify).mockReturnValue({ email: 'nonexistent@example.com', id: 999 } as unknown);
      jest.mocked(getUserByEmail).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: { 'Cookie': 'auth-token=valid-jwt-token' }
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Utilisateur non trouvé');
    });

    it('should handle database errors gracefully', async () => {
      const jwt = await import('jsonwebtoken');
      const { getUserByEmail } = await import('../../../lib/auth-db');
      
      jest.mocked(jwt.verify).mockReturnValue({ email: 'test@example.com', id: 1 } as unknown);
      jest.mocked(getUserByEmail).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: { 'Cookie': 'auth-token=valid-jwt-token' }
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Token invalide');
    });

    it('should not leak sensitive information in responses', async () => {
      const jwt = await import('jsonwebtoken');
      const { getUserByEmail } = await import('../../../lib/auth-db');
      
      jest.mocked(jwt.verify).mockReturnValue({ email: 'test@example.com', id: 1 } as unknown);
      jest.mocked(getUserByEmail).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: { 'Cookie': 'auth-token=valid-jwt-token' }
      });

      const response = await GET(request);
      
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('hash');
      expect(responseText).not.toContain('$2a$');
    });

    it('should handle malformed JWT gracefully', async () => {
      const jwt = await import('jsonwebtoken');
      jest.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid JWT');
      });

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          'Cookie': 'auth-token=invalid.jwt.token'
        }
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });
});