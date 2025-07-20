import bcrypt from 'bcrypt';
import db from './database';

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
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
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