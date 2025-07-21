/**
 * @jest-environment node
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

// Test database setup
const testDbDir = join(process.cwd(), 'test-data');
const testDbPath = join(testDbDir, 'test-scoresheets.db');

let testDb: Database.Database;

// Mock the unified database to use our test database
jest.mock('../../lib/database', () => {
  return {
    db: {
      execute: async (sql: string | { sql: string; args: unknown[] }) => {
        const actualSql = typeof sql === 'string' ? sql : sql.sql;
        const args = typeof sql === 'string' ? [] : (sql.args || []);
        
        if (actualSql.includes('SELECT')) {
          const result = testDb.prepare(actualSql).all(...args);
          return { rows: result };
        } else {
          const result = testDb.prepare(actualSql).run(...args);
          return { 
            lastInsertRowId: result.lastInsertRowid,
            rowsAffected: result.changes 
          };
        }
      }
    },
    initializeDatabase: jest.fn().mockResolvedValue(undefined)
  };
});

describe('Database Integration Tests', () => {
  beforeAll(() => {
    // Create test database directory
    if (!existsSync(testDbDir)) {
      mkdirSync(testDbDir, { recursive: true });
    }
    
    // Remove existing test database
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
    
    // Create new test database
    testDb = new Database(testDbPath);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
    // Clean up test database
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
    if (existsSync(testDbDir)) {
      rmSync(testDbDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Initialize database schema manually for test
    // @ts-expect-error - SQLite syntax not recognized by PhpStorm
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS game_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (game_id) REFERENCES games (id)
      );

      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions (id) ON DELETE CASCADE
      );

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
        FOREIGN KEY (session_id) REFERENCES game_sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        player_name TEXT NOT NULL,
        games_played INTEGER DEFAULT 0,
        last_played DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, player_name),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      INSERT OR IGNORE INTO game_categories (name, description) VALUES 
        ('Jeux de cartes', 'Jeux utilisant des cartes traditionnelles'),
        ('Jeux de dés', 'Jeux utilisant des dés'),
        ('Jeux de plateau', 'Jeux de société classiques');
      
      INSERT OR IGNORE INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, score_direction) VALUES 
        ('Yams (Yahtzee)', 'yams', 2, 'Test rules', 1, 'categories', 0, 1, 8, 'higher');
    `);
  });

  afterEach(() => {
    // Clean up data after each test
    try {
      // @ts-expect-error - SQLite syntax not recognized by PhpStorm
      testDb.exec(`
        DELETE FROM scores;
        DELETE FROM players;
        DELETE FROM game_sessions;
        DELETE FROM user_players;
        DELETE FROM games WHERE slug != 'yams';
        DELETE FROM users;
      `);
    } catch (error) {
      // Tables might not exist yet, ignore the error
      console.log('Cleanup error (expected if tables not created yet):', error);
    }
  });

  describe('Game Management', () => {
    it('should retrieve Yams game from database', async () => {
      const { db } = await import('../../lib/database');
      
      const result = await db.execute({
        sql: 'SELECT * FROM games WHERE slug = ?',
        args: ['yams']
      });
      const game = result.rows[0];
      
      expect(game).toBeDefined();
      expect(game).toMatchObject({
        name: 'Yams (Yahtzee)',
        slug: 'yams',
        is_implemented: 1,
        score_type: 'categories'
      });
    });

    it('should list all games with categories', async () => {
      const { db } = await import('../../lib/database');
      
      const result = await db.execute(`
        SELECT 
          g.id,
          g.name,
          g.slug,
          g.is_implemented,
          gc.name as category_name
        FROM games g
        JOIN game_categories gc ON g.category_id = gc.id
        ORDER BY gc.name, g.name
      `);
      const games = result.rows;
      
      expect(games).toHaveLength(1);
      expect(games[0]).toMatchObject({
        name: 'Yams (Yahtzee)',
        slug: 'yams',
        category_name: 'Jeux de dés'
      });
    });
  });

  describe('Session Management', () => {
    let userId: number;
    let gameId: number;

    beforeEach(async () => {
      const { db } = await import('../../lib/database');
      
      // Create test user
      const userResult = await db.execute({
        sql: `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
        args: ['testuser', 'test@example.com', 'hashed_password']
      });
      userId = Number(userResult.lastInsertRowId);

      // Get Yams game ID
      const gameResult = await db.execute({
        sql: 'SELECT id FROM games WHERE slug = ?',
        args: ['yams']
      });
      gameId = gameResult.rows[0]?.id as number;
    });

    it('should create a game session successfully', async () => {
      const { db } = await import('../../lib/database');
      
      const sessionResult = await db.execute({
        sql: `INSERT INTO game_sessions (user_id, game_id, session_name, has_score_target, score_target, finish_current_round, score_direction)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [userId, gameId, 'Test Session', 0, null, 0, 'higher']
      });
      
      const sessionId = Number(sessionResult.lastInsertRowId);
      expect(sessionId).toBeGreaterThan(0);
      
      // Verify session was created
      const sessionQuery = await db.execute({
        sql: 'SELECT * FROM game_sessions WHERE id = ?',
        args: [sessionId]
      });
      const session = sessionQuery.rows[0];
      
      expect(session).toMatchObject({
        user_id: userId,
        game_id: gameId,
        session_name: 'Test Session',
        has_score_target: 0,
        score_direction: 'higher'
      });
    });
  });

  describe('Score Management', () => {
    let userId: number;
    let gameId: number;
    let sessionId: number;
    let playerId: number;

    beforeEach(async () => {
      const { db } = await import('../../lib/database');
      
      // Create test user
      const userResult = await db.execute({
        sql: `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
        args: ['testuser', 'test@example.com', 'hashed_password']
      });
      userId = Number(userResult.lastInsertRowId);

      // Get game ID
      const gameQuery = await db.execute({
        sql: 'SELECT id FROM games WHERE slug = ?',
        args: ['yams']
      });
      gameId = gameQuery.rows[0]?.id as number;

      // Create session
      const sessionResult = await db.execute({
        sql: `INSERT INTO game_sessions (user_id, game_id, session_name) VALUES (?, ?, ?)`,
        args: [userId, gameId, 'Test Session']
      });
      sessionId = Number(sessionResult.lastInsertRowId);

      // Create player
      const playerResult = await db.execute({
        sql: `INSERT INTO players (session_id, name, position) VALUES (?, ?, ?)`,
        args: [sessionId, 'Alice', 0]
      });
      playerId = Number(playerResult.lastInsertRowId);
    });

    it('should record scores for players', async () => {
      const { db } = await import('../../lib/database');
      
      // Record a score
      const scoreResult = await db.execute({
        sql: `INSERT INTO scores (session_id, player_id, round_number, score_type, score_value, details)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [sessionId, playerId, 1, 'ones', 4, '1,1,1,1,2']
      });
      
      expect(Number(scoreResult.lastInsertRowId)).toBeGreaterThan(0);
      
      // Verify score was recorded
      const scoreQuery = await db.execute({
        sql: 'SELECT * FROM scores WHERE id = ?',
        args: [scoreResult.lastInsertRowId]
      });
      const score = scoreQuery.rows[0];
      
      expect(score).toMatchObject({
        session_id: sessionId,
        player_id: playerId,
        round_number: 1,
        score_type: 'ones',
        score_value: 4,
        details: '1,1,1,1,2'
      });
    });

    it('should calculate total scores correctly', async () => {
      const { db } = await import('../../lib/database');
      
      // Record multiple scores
      const scores = [
        { round: 1, type: 'ones', value: 4 },
        { round: 2, type: 'twos', value: 6 },
        { round: 3, type: 'threes', value: 9 }
      ];

      for (const score of scores) {
        await db.execute({
          sql: `INSERT INTO scores (session_id, player_id, round_number, score_type, score_value)
                VALUES (?, ?, ?, ?, ?)`,
          args: [sessionId, playerId, score.round, score.type, score.value]
        });
      }

      // Calculate total
      const totalQuery = await db.execute({
        sql: `SELECT SUM(score_value) as total FROM scores WHERE session_id = ? AND player_id = ?`,
        args: [sessionId, playerId]
      });
      const totalResult = totalQuery.rows[0];
      
      expect(totalResult?.total).toBe(19); // 4 + 6 + 9
    });
  });
});