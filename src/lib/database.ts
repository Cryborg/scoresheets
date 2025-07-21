// Unified database layer using Turso for both development and production
import { createClient, Client } from '@libsql/client';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Create unified Turso client
const tursoClient: Client = createClient({
  url: isProduction 
    ? (process.env.TURSO_DATABASE_URL || 'libsql://scoresheets-cryborg.aws-eu-west-1.turso.io')
    : 'file:./data/scoresheets.db', // Local Turso database
  authToken: isProduction ? process.env.TURSO_AUTH_TOKEN : undefined
});

// Backward compatibility wrapper for db.prepare() API
// TODO: Remove once all routes migrate to db.execute()
const legacyWrapper = {
  execute: tursoClient.execute.bind(tursoClient),
  prepare: (sql: string) => ({
    get: async (...params: any[]) => {
      const result = await tursoClient.execute({ sql, args: params });
      return result.rows[0];
    },
    all: async (...params: any[]) => {
      const result = await tursoClient.execute({ sql, args: params });
      return result.rows;
    },
    run: async (...params: any[]) => {
      const result = await tursoClient.execute({ sql, args: params });
      return {
        lastInsertRowid: Number(result.lastInsertRowId),
        changes: result.rowsAffected
      };
    }
  })
};

// Database initialization
export async function initializeDatabase(): Promise<void> {
  try {
    // Ensure data directory exists for local development
    if (!isProduction) {
      const dataDir = join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }
    }

    // Create tables
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS game_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category_id INTEGER,
        rules TEXT,
        is_implemented BOOLEAN DEFAULT FALSE,
        score_type TEXT DEFAULT 'rounds',
        team_based BOOLEAN DEFAULT FALSE,
        min_players INTEGER DEFAULT 2,
        max_players INTEGER DEFAULT 6,
        score_direction TEXT DEFAULT 'higher',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES game_categories(id)
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_name TEXT NOT NULL,
        game_id INTEGER,
        user_id INTEGER NOT NULL,
        has_score_target BOOLEAN DEFAULT FALSE,
        score_target INTEGER DEFAULT 0,
        finish_current_round BOOLEAN DEFAULT FALSE,
        score_direction TEXT DEFAULT 'higher',
        date_played DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        round_number INTEGER,
        score_type TEXT DEFAULT 'round',
        score_value INTEGER DEFAULT 0,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS user_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        player_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, player_name)
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS game_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed initial data
    await seedInitialData();

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function seedInitialData(): Promise<void> {
  // Check if we already have categories
  const existingCategories = await tursoClient.execute('SELECT COUNT(*) as count FROM game_categories');
  const categoryCount = existingCategories.rows[0]?.count as number || 0;

  if (categoryCount === 0) {
    await tursoClient.execute(`
      INSERT INTO game_categories (name, description) VALUES
      ('Jeux de cartes', 'Jeux utilisant des cartes traditionnelles'),
      ('Jeux de dés', 'Jeux utilisant des dés'),
      ('Jeux de plateau', 'Jeux de société classiques')
    `);
  }

  // Check if we already have games
  const existingGames = await tursoClient.execute('SELECT COUNT(*) as count FROM games');
  const gameCount = existingGames.rows[0]?.count as number || 0;

  if (gameCount === 0) {
    // Add Yams
    await tursoClient.execute(`
      INSERT INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, score_direction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Yams (Yahtzee)',
      'yams',
      2, // Jeux de dés
      'Jeu de dés classique avec 5 dés. Objectif: réaliser des combinaisons pour marquer le maximum de points dans chaque catégorie.',
      1, // is_implemented
      'categories',
      0, // team_based
      2, // min_players
      6, // max_players
      'higher'
    ]);

    // Add Belote
    await tursoClient.execute(`
      INSERT INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, score_direction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Belote',
      'belote',
      1, // Jeux de cartes
      'Jeu de cartes français classique se jouant en équipes de 2 avec un jeu de 32 cartes. Objectif: être la première équipe à atteindre 501 points.',
      1, // is_implemented
      'rounds',
      1, // team_based
      4, // min_players
      4, // max_players
      'higher'
    ]);
  }

  // Create admin user if it doesn't exist
  const existingAdmin = await tursoClient.execute({
    sql: 'SELECT id FROM users WHERE email = ?', 
    args: ['cryborg.live@gmail.com']
  });
  if (existingAdmin.rows.length === 0) {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('Célibataire1979$', 10);
    
    await tursoClient.execute({
      sql: `INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)`,
      args: ['Admin', 'cryborg.live@gmail.com', hashedPassword, 1]
    });
  }
}

// Export the backward compatibility wrapper
export const db = legacyWrapper;

// Export unified database instance for new code
export default tursoClient;