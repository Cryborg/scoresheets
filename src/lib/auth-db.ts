import bcrypt from 'bcrypt';
import { db, initializeDatabase } from './database';

interface AuthCredentials {
  email: string;
  password: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  is_admin?: boolean;
}

export async function authenticateUser({ email, password }: AuthCredentials): Promise<User | null> {
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    
    const user = result.rows[0] as { 
      id: number; 
      email: string; 
      password_hash: string; 
      username: string; 
      is_admin: number; 
      created_at: string; 
      updated_at: string; 
    } | undefined;
    
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
      email: user.email,
      is_admin: Boolean(user.is_admin)
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    await initializeDatabase();
    
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    
    const user = result.rows[0] as { 
      id: number; 
      email: string; 
      password_hash: string; 
      username: string; 
      is_admin: number; 
      created_at: string; 
      updated_at: string; 
    } | undefined;
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: Boolean(user.is_admin)
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
    
    const result = await db.execute({
      sql: `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      args: [username, email, passwordHash]
    });

    return {
      id: Number(result.lastInsertRowId),
      username,
      email
    };
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}