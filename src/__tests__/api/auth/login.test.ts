/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/auth/login/route';

// Mock auth-db functions
jest.mock('../../../lib/auth-db', () => ({
  authenticateUser: jest.fn()
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

describe('/api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST', () => {
    it('should authenticate user successfully with valid credentials', async () => {
      const { authenticateUser } = await import('../../../lib/auth-db');
      jest.mocked(authenticateUser).mockResolvedValue(mockUser);

      const requestBody = {
        email: 'test@example.com',
        password: 'validpassword123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Connexion réussie');
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id', 1);
      expect(data.user).toHaveProperty('email', 'test@example.com');
      expect(data.user).toHaveProperty('username', 'testuser');

      // Verify cookies are set
      const cookies = response.cookies;
      expect(cookies.get('auth-token')).toBeTruthy();
      expect(cookies.get('auth-check')).toBeTruthy();
    });

    it('should handle admin user login correctly', async () => {
      const { authenticateUser } = await import('../../../lib/auth-db');
      jest.mocked(authenticateUser).mockResolvedValue(mockAdminUser);

      const requestBody = {
        email: 'admin@example.com',
        password: 'adminpassword'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user).toHaveProperty('is_admin', true);
    });

    it('should reject login with invalid credentials', async () => {
      const { authenticateUser } = await import('../../../lib/auth-db');
      jest.mocked(authenticateUser).mockResolvedValue(null);

      const requestBody = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Email ou mot de passe incorrect');
      
      // No cookies should be set
      expect(response.cookies.get('auth-token')).toBeFalsy();
    });

    it('should validate required email field', async () => {
      const requestBody = {
        password: 'password123'
        // email missing
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Email et mot de passe requis');
    });

    it('should validate required password field', async () => {
      const requestBody = {
        email: 'test@example.com'
        // password missing
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Email et mot de passe requis');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid-json{',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Erreur serveur');
    });

    it('should handle authentication errors gracefully', async () => {
      const { authenticateUser } = await import('../../../lib/auth-db');
      jest.mocked(authenticateUser).mockRejectedValue(new Error('Database error'));

      const requestBody = {
        email: 'test@example.com',
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Erreur serveur');
    });

    it('should not leak sensitive information in responses', async () => {
      const { authenticateUser } = await import('../../../lib/auth-db');
      jest.mocked(authenticateUser).mockResolvedValue(mockUser);

      const requestBody = {
        email: 'test@example.com',
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(JSON.stringify(data)).not.toContain('password_hash');
      expect(JSON.stringify(data)).not.toContain('$2a$');
    });
  });
});