import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Ensure data directory exists
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'scoresheets.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS game_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES game_categories (id)
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    category_id INTEGER NOT NULL,
    rules TEXT,
    is_implemented BOOLEAN DEFAULT FALSE,
    score_type TEXT DEFAULT 'rounds', -- 'rounds', 'categories', 'contracts'
    team_based BOOLEAN DEFAULT FALSE,
    min_players INTEGER DEFAULT 2,
    max_players INTEGER DEFAULT 6,
    score_direction TEXT DEFAULT 'higher', -- 'higher' or 'lower' - determines if higher scores are better
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES game_categories (id)
  );

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
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES game_sessions (id)
  );

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
  );

  CREATE TABLE IF NOT EXISTS user_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    games_played INTEGER DEFAULT 0,
    last_played DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, player_name),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

// Add score_direction column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE games ADD COLUMN score_direction TEXT DEFAULT 'higher'`);
} catch (error) {
  // Column already exists, ignore error
}

// Add missing columns to game_sessions table if they don't exist (migration)
try {
  db.exec(`ALTER TABLE game_sessions ADD COLUMN has_score_target BOOLEAN DEFAULT FALSE`);
} catch (error) {
  // Column already exists, ignore error
}
try {
  db.exec(`ALTER TABLE game_sessions ADD COLUMN score_target INTEGER`);
} catch (error) {
  // Column already exists, ignore error
}
try {
  db.exec(`ALTER TABLE game_sessions ADD COLUMN finish_current_round BOOLEAN DEFAULT FALSE`);
} catch (error) {
  // Column already exists, ignore error
}
try {
  db.exec(`ALTER TABLE game_sessions ADD COLUMN score_direction TEXT DEFAULT 'higher'`);
} catch (error) {
  // Column already exists, ignore error
}

// Clean database: keep only Yams which has unique scoring system
// Remove all other games and their related data to avoid foreign key constraints
db.exec(`
  DELETE FROM scores WHERE session_id IN (
    SELECT gs.id FROM game_sessions gs 
    JOIN games g ON gs.game_id = g.id 
    WHERE g.slug <> 'yams'
  );
  
  DELETE FROM players WHERE session_id IN (
    SELECT gs.id FROM game_sessions gs 
    JOIN games g ON gs.game_id = g.id 
    WHERE g.slug <> 'yams'
  );
  
  DELETE FROM game_sessions WHERE game_id IN (
    SELECT id FROM games WHERE slug <> 'yams'
  );
  
  DELETE FROM games WHERE slug <> 'yams';
`);

db.exec(`
  INSERT OR IGNORE INTO game_categories (name) VALUES 
    ('Jeux de cartes'),
    ('Jeux de dés'),
    ('Jeux de plis');
  
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

**FIN DE PARTIE :** Après 13 tours (toutes les catégories remplies). Le plus haut score gagne.', TRUE, 'categories', FALSE, 1, 8, 'higher');
`);

export default db;