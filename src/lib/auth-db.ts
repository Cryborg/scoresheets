import bcrypt from 'bcrypt';
import { db, initializeDatabase } from './database-async';

interface AuthCredentials {
  email: string;
  password: string;
}

interface User {
  id: number;
  username: string;
  email: string;
}

export async function authenticateUser({ email, password }: AuthCredentials): Promise<User | null> {
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    await initializeDatabase();
    
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email
    };
  } catch (error) {
    console.error('Get user by email error:', error);
    return null;
  }
}

export async function createUser({ username, email, password }: { username: string; email: string; password: string }): Promise<User> {
  try {
    await initializeDatabase();
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `).run(username, email, passwordHash);

    return {
      id: result.lastInsertRowid,
      username,
      email
    };
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}