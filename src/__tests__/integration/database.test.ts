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

// Mock the async database to use our test database
jest.mock('../../lib/database-async', () => {
  const originalModule = jest.requireActual('../../lib/database-async');
  
  return {
    ...originalModule,
    db: {
      prepare: (sql: string) => {
        const stmt = testDb.prepare(sql);
        return {
          run: async (...params: unknown[]) => {
            const result = stmt.run(...params);
            return {
              lastInsertRowid: Number(result.lastInsertRowid),
              changes: result.changes
            };
          },
          get: async (...params: unknown[]) => stmt.get(...params),
          all: async (...params: unknown[]) => stmt.all(...params)
        };
      },
      exec: async (sql: string) => testDb.exec(sql),
      transaction: async (fn: () => Promise<unknown>) => {
        const txn = testDb.transaction(() => fn());
        return await txn();
      }
    }
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
    testDb.exec(`
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
        score_type TEXT DEFAULT 'rounds',
        team_based BOOLEAN DEFAULT FALSE,
        min_players INTEGER DEFAULT 2,
        max_players INTEGER DEFAULT 6,
        score_direction TEXT DEFAULT 'higher',
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

      INSERT OR IGNORE INTO game_categories (name) VALUES 
        ('Jeux de cartes'),
        ('Jeux de dés'),
        ('Jeux de plis');
      
      INSERT OR IGNORE INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, score_direction) VALUES 
        ('Yams (Yahtzee)', 'yams', 2, 'Test rules', TRUE, 'categories', FALSE, 1, 8, 'higher');
    `);
  });

  afterEach(() => {
    // Clean up data after each test, but only if tables exist
    try {
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
      const { db } = await import('../../lib/database-async');
      
      const game = await db.prepare('SELECT * FROM games WHERE slug = ?').get('yams');
      
      expect(game).toBeDefined();
      expect(game).toMatchObject({
        name: 'Yams (Yahtzee)',
        slug: 'yams',
        is_implemented: 1,
        score_type: 'categories'
      });
    });

    it('should list all games with categories', async () => {
      const { db } = await import('../../lib/database-async');
      
      const games = await db.prepare(`
        SELECT 
          g.id,
          g.name,
          g.slug,
          g.is_implemented,
          gc.name as category_name
        FROM games g
        JOIN game_categories gc ON g.category_id = gc.id
        ORDER BY gc.name, g.name
      `).all();
      
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
      const { db } = await import('../../lib/database-async');
      
      // Create test user
      const userResult = await db.prepare(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `).run('testuser', 'test@example.com', 'hashed_password');
      userId = userResult.lastInsertRowid;

      // Get Yams game ID
      const game = await db.prepare('SELECT id FROM games WHERE slug = ?').get('yams');
      gameId = game.id;
    });

    it('should create a game session successfully', async () => {
      const { db } = await import('../../lib/database-async');
      
      const sessionResult = await db.prepare(`
        INSERT INTO game_sessions (user_id, game_id, session_name, has_score_target, score_target, finish_current_round, score_direction)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, gameId, 'Test Session', 0, null, 0, 'higher');
      
      const sessionId = sessionResult.lastInsertRowid;
      expect(sessionId).toBeGreaterThan(0);
      
      // Verify session was created
      const session = await db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(sessionId);
      expect(session).toMatchObject({
        user_id: userId,
        game_id: gameId,
        session_name: 'Test Session',
        has_score_target: 0,
        score_direction: 'higher'
      });
    });

    it('should create players for a session', async () => {
      const { db } = await import('../../lib/database-async');
      
      // Create session
      const sessionResult = await db.prepare(`
        INSERT INTO game_sessions (user_id, game_id, session_name)
        VALUES (?, ?, ?)
      `).run(userId, gameId, 'Test Session');
      const sessionId = sessionResult.lastInsertRowid;

      // Add players
      const players = ['Alice', 'Bob', 'Charlie'];
      for (let i = 0; i < players.length; i++) {
        await db.prepare(`
          INSERT INTO players (session_id, name, position)
          VALUES (?, ?, ?)
        `).run(sessionId, players[i], i);
      }

      // Verify players were created
      const sessionPlayers = await db.prepare('SELECT * FROM players WHERE session_id = ? ORDER BY position').all(sessionId);
      expect(sessionPlayers).toHaveLength(3);
      expect(sessionPlayers.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should track user player statistics', async () => {
      const { db } = await import('../../lib/database-async');
      
      // Add a player for the first time
      await db.prepare(`
        INSERT INTO user_players (user_id, player_name, games_played)
        VALUES (?, ?, ?)
      `).run(userId, 'Alice', 1);

      // Update player stats (simulate another game)
      await db.prepare(`
        INSERT INTO user_players (user_id, player_name, games_played) 
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, player_name) DO UPDATE SET
          games_played = games_played + 1,
          last_played = CURRENT_TIMESTAMP
      `).run(userId, 'Alice', 1);

      // Verify stats
      const playerStats = await db.prepare('SELECT * FROM user_players WHERE user_id = ? AND player_name = ?').get(userId, 'Alice');
      expect(playerStats).toMatchObject({
        user_id: userId,
        player_name: 'Alice',
        games_played: 2
      });
      expect(playerStats.last_played).toBeDefined();
    });
  });

  describe('Score Management', () => {
    let userId: number;
    let gameId: number;
    let sessionId: number;
    let playerId: number;

    beforeEach(async () => {
      const { db } = await import('../../lib/database-async');
      
      // Create test user
      const userResult = await db.prepare(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `).run('testuser', 'test@example.com', 'hashed_password');
      userId = userResult.lastInsertRowid;

      // Get game ID
      const game = await db.prepare('SELECT id FROM games WHERE slug = ?').get('yams');
      gameId = game.id;

      // Create session
      const sessionResult = await db.prepare(`
        INSERT INTO game_sessions (user_id, game_id, session_name)
        VALUES (?, ?, ?)
      `).run(userId, gameId, 'Test Session');
      sessionId = sessionResult.lastInsertRowid;

      // Create player
      const playerResult = await db.prepare(`
        INSERT INTO players (session_id, name, position)
        VALUES (?, ?, ?)
      `).run(sessionId, 'Alice', 0);
      playerId = playerResult.lastInsertRowid;
    });

    it('should record scores for players', async () => {
      const { db } = await import('../../lib/database-async');
      
      // Record a score
      const scoreResult = await db.prepare(`
        INSERT INTO scores (session_id, player_id, round_number, score_type, score_value, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(sessionId, playerId, 1, 'ones', 4, '1,1,1,1,2');
      
      expect(scoreResult.lastInsertRowid).toBeGreaterThan(0);
      
      // Verify score was recorded
      const score = await db.prepare('SELECT * FROM scores WHERE id = ?').get(scoreResult.lastInsertRowid);
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
      const { db } = await import('../../lib/database-async');
      
      // Record multiple scores
      const scores = [
        { round: 1, type: 'ones', value: 4 },
        { round: 2, type: 'twos', value: 6 },
        { round: 3, type: 'threes', value: 9 }
      ];

      for (const score of scores) {
        await db.prepare(`
          INSERT INTO scores (session_id, player_id, round_number, score_type, score_value)
          VALUES (?, ?, ?, ?, ?)
        `).run(sessionId, playerId, score.round, score.type, score.value);
      }

      // Calculate total
      const totalResult = await db.prepare(`
        SELECT SUM(score_value) as total 
        FROM scores 
        WHERE session_id = ? AND player_id = ?
      `).get(sessionId, playerId);
      
      expect(totalResult.total).toBe(19); // 4 + 6 + 9
    });
  });
});