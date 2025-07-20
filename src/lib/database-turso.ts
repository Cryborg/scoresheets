import { createClient } from '@libsql/client';

// Use environment variables for production
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://scoresheets-cryborg.aws-eu-west-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTMwMzY1MzgsImlkIjoiY2FiZDM5YzAtZjBhZi00ZGVlLWJhZjktMjYyMWE2ZjA3YTkxIiwicmlkIjoiMjMxYThlNWUtMGVjNC00M2QzLWE2YzYtYTJlNTM0ZmU0NWYzIn0.MXHAnZx3w5V4mr9DkxLKiXRzuiu_OdcWcudBgZKSOc1tGgx0ABambhds_YsozeODYicUr0UA5xTvygibeDWFBw'
});

// Initialize database schema
async function initializeDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS game_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES game_categories (id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL,
      rules TEXT,
      is_implemented BOOLEAN DEFAULT FALSE,
      score_type TEXT DEFAULT 'rounds',
      team_based BOOLEAN DEFAULT FALSE,
      min_players INTEGER DEFAULT 2,
      max_players INTEGER DEFAULT 6,
      score_direction TEXT DEFAULT 'higher',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES game_categories (id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_id INTEGER,
      session_name TEXT,
      has_score_target BOOLEAN DEFAULT FALSE,
      score_target INTEGER,
      finish_current_round BOOLEAN DEFAULT FALSE,
      score_direction TEXT DEFAULT 'higher',
      date_played DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (game_id) REFERENCES games (id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES game_sessions (id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      score_type TEXT NOT NULL,
      score_value INTEGER NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES game_sessions (id),
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      games_played INTEGER DEFAULT 0,
      last_played DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, player_name),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Insert initial data
  await db.execute(`
    INSERT OR IGNORE INTO game_categories (name) VALUES 
      ('Jeux de cartes'),
      ('Jeux de dés'),
      ('Jeux de plis')
  `);

  await db.execute(`
    INSERT OR IGNORE INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, score_direction) VALUES 
      ('Yams (Yahtzee)', 'yams', 2, '**OBJECTIF :** Obtenir le maximum de points en réalisant des combinaisons avec 5 dés en 13 catégories.

**MATÉRIEL :** 5 dés, feuille de score. Se joue à 1+ joueurs.

**DÉROULEMENT :**
1. Lancer les 5 dés
2. Garder les dés souhaités, relancer les autres (max 3 lancers)
3. Inscrire le résultat dans une catégorie au choix (une seule fois par catégorie)

**CATÉGORIES :**
- **Section supérieure :** Somme des 1, 2, 3, 4, 5, 6 (bonus +35 si total ≥63)
- **Section inférieure :** Brelan (somme des dés), Carré (somme), Full (25 pts), Petite suite (30 pts), Grande suite (40 pts), Yams (50 pts), Chance (somme)

**FIN DE PARTIE :** Après 13 tours (toutes les catégories remplies). Le plus haut score gagne.', TRUE, 'categories', FALSE, 1, 8, 'higher')
  `);
}

// Initialize on first import
initializeDatabase().catch(console.error);

// Helper functions to match better-sqlite3 API
export default {
  prepare: (query: string) => {
    return {
      run: async (...params: any[]) => {
        const result = await db.execute({
          sql: query,
          args: params
        });
        return {
          lastInsertRowid: result.lastInsertRowId,
          changes: result.rowsAffected
        };
      },
      get: async (...params: any[]) => {
        const result = await db.execute({
          sql: query,
          args: params
        });
        return result.rows[0] || undefined;
      },
      all: async (...params: any[]) => {
        const result = await db.execute({
          sql: query,
          args: params
        });
        return result.rows;
      }
    };
  },
  
  exec: async (sql: string) => {
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await db.execute(statement);
      }
    }
  },
  
  transaction: (fn: Function) => {
    return async () => {
      // Turso handles transactions automatically
      return await fn();
    };
  }
};