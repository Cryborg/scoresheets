/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST as addRound } from '../../../app/api/games/belote/sessions/[sessionId]/rounds/route';
import { GET as getBeloteSession } from '../../../app/api/games/belote/sessions/[sessionId]/route';

// Mock auth
jest.mock('../../../lib/auth', () => ({
  getAuthenticatedUserId: jest.fn().mockReturnValue(1),
  unauthorizedResponse: jest.fn().mockReturnValue(new Response('Unauthorized', { status: 401 }))
}));

// Mock database avec des données Belote spécifiques
const mockBeloteSessionData = {
  id: 123,
  session_name: 'Partie Belote Test',
  score_target: 501,
  game_name: 'Belote',
  game_slug: 'belote'
};

const mockPlayers = [
  { id: 1, name: 'Alice', position: 0 },   // Team 1
  { id: 2, name: 'Bob', position: 1 },     // Team 2  
  { id: 3, name: 'Charlie', position: 2 }, // Team 1
  { id: 4, name: 'David', position: 3 }    // Team 2
];

const mockScoreData = [
  // Round 1: Team 1 = 160 pts, Team 2 = 2 pts
  { session_id: 123, player_id: 1, round_number: 1, score_type: 'round_score', score_value: 80 }, // Alice (Team 1)
  { session_id: 123, player_id: 3, round_number: 1, score_type: 'round_score', score_value: 80 }, // Charlie (Team 1)
  { session_id: 123, player_id: 2, round_number: 1, score_type: 'round_score', score_value: 1 },  // Bob (Team 2)
  { session_id: 123, player_id: 4, round_number: 1, score_type: 'round_score', score_value: 1 },  // David (Team 2)
];

jest.mock('../../../lib/database', () => ({
  db: {
    prepare: jest.fn().mockImplementation((sql: string) => {
      // Mock session verification
      if (sql.includes('SELECT gs.id') && sql.includes('belote')) {
        return {
          get: jest.fn().mockReturnValue({ id: 123 })
        };
      }
      
      // Mock session + game info for GET
      if (sql.includes('SELECT gs.*, g.name as game_name')) {
        return {
          get: jest.fn().mockReturnValue(mockBeloteSessionData)
        };
      }
      
      // Mock players query
      if (sql.includes('SELECT id, name, position') || sql.includes('SELECT id, position')) {
        return {
          all: jest.fn().mockReturnValue(mockPlayers)
        };
      }
      
      // Mock rounds data with SUM query
      if (sql.includes('SUM(CASE WHEN players.position IN (0, 2)')) {
        return {
          all: jest.fn().mockReturnValue([
            {
              round_number: 1,
              details: '{"trump":"hearts","taker_team":0}',
              team1_total: 160, // Sum of 80 + 80
              team2_total: 2    // Sum of 1 + 1  
            }
          ])
        };
      }
      
      // Mock DELETE and INSERT for adding rounds
      if (sql.includes('DELETE FROM scores') || sql.includes('INSERT INTO scores')) {
        return {
          run: jest.fn().mockReturnValue({ changes: 1 })
        };
      }
      
      // Default mock
      return {
        get: jest.fn().mockReturnValue(null),
        all: jest.fn().mockReturnValue([]),
        run: jest.fn().mockReturnValue({ changes: 0 })
      };
    })
  },
  initializeDatabase: jest.fn().mockResolvedValue(undefined)
}));

describe('Belote Scoring Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Score Recording and Retrieval', () => {
    it('should correctly record and retrieve exact team scores without multiplication', async () => {
      // Test the critical bug: 160 and 2 should stay 160 and 2, not become 1600 and 20
      
      // 1. Add a round with specific scores
      const addRoundRequest = new NextRequest('http://localhost:3000/api/games/belote/sessions/123/rounds', {
        method: 'POST',
        body: JSON.stringify({
          round_number: 1,
          team_scores: {
            0: 160,  // Team 1 score
            1: 2     // Team 2 score  
          },
          details: {
            trump: 'hearts',
            taker_team: 0,
            contract: 80,
            made: true,
            belote_rebelote: 0
          }
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const addResponse = await addRound(addRoundRequest, { params: Promise.resolve({ sessionId: '123' }) });
      
      expect(addResponse.status).toBe(200);
      
      // 2. Retrieve the session data
      const getRequest = new NextRequest('http://localhost:3000/api/games/belote/sessions/123');
      const getResponse = await getBeloteSession(getRequest, { params: Promise.resolve({ sessionId: '123' }) });
      
      expect(getResponse.status).toBe(200);
      
      const data = await getResponse.json();
      const rounds = data.session.rounds;
      
      // 3. CRITICAL TEST: Verify exact scores (no multiplication by 10)
      expect(rounds).toHaveLength(1);
      expect(rounds[0].round_number).toBe(1);
      expect(rounds[0].team_scores[0]).toBe(160); // Should be exactly 160, NOT 1600
      expect(rounds[0].team_scores[1]).toBe(2);   // Should be exactly 2, NOT 20
    });

    it('should handle various score combinations correctly', async () => {
      // Test different score scenarios to ensure robustness
      const testCases = [
        { team1: 162, team2: 0 },   // Capot
        { team1: 81, team2: 81 },   // Perfect split  
        { team1: 120, team2: 42 },  // Common scenario
        { team1: 0, team2: 162 }    // Reverse capot
      ];
      
      for (const testCase of testCases) {
        // Mock the database to return our test case
        const { db } = await import('../../../lib/database');
        jest.mocked(db.prepare).mockImplementation((sql: string) => {
          if (sql.includes('SUM(CASE WHEN players.position IN (0, 2)')) {
            return {
              all: jest.fn().mockReturnValue([
                {
                  round_number: 1,
                  details: '{"trump":"spades"}',
                  team1_total: testCase.team1,
                  team2_total: testCase.team2
                }
              ])
            };
          }
          // Other mocks...
          return {
            get: jest.fn().mockReturnValue(mockBeloteSessionData),
            all: jest.fn().mockReturnValue(mockPlayers),
            run: jest.fn().mockReturnValue({ changes: 1 })
          };
        });
        
        const getRequest = new NextRequest('http://localhost:3000/api/games/belote/sessions/123');
        const getResponse = await getBeloteSession(getRequest, { params: Promise.resolve({ sessionId: '123' }) });
        
        const data = await getResponse.json();
        const rounds = data.session.rounds;
        
        // Verify exact scores without any multiplication
        expect(rounds[0].team_scores[0]).toBe(testCase.team1);
        expect(rounds[0].team_scores[1]).toBe(testCase.team2);
      }
    });

    it('should correctly calculate running totals across multiple rounds', async () => {
      // Mock multiple rounds
      const { db } = await import('../../../lib/database');
      jest.mocked(db.prepare).mockImplementation((sql: string) => {
        if (sql.includes('SUM(CASE WHEN players.position IN (0, 2)')) {
          return {
            all: jest.fn().mockReturnValue([
              { round_number: 1, details: null, team1_total: 100, team2_total: 62 },
              { round_number: 2, details: null, team1_total: 80, team2_total: 82 },
              { round_number: 3, details: null, team1_total: 120, team2_total: 42 }
            ])
          };
        }
        return {
          get: jest.fn().mockReturnValue(mockBeloteSessionData),
          all: jest.fn().mockReturnValue(mockPlayers),
          run: jest.fn().mockReturnValue({ changes: 1 })
        };
      });
      
      const getRequest = new NextRequest('http://localhost:3000/api/games/belote/sessions/123');
      const getResponse = await getBeloteSession(getRequest, { params: Promise.resolve({ sessionId: '123' }) });
      
      const data = await getResponse.json();
      const rounds = data.session.rounds;
      
      // Verify each round has exact scores  
      expect(rounds[0].team_scores[0]).toBe(100);  // NOT 1000
      expect(rounds[0].team_scores[1]).toBe(62);   // NOT 620
      expect(rounds[1].team_scores[0]).toBe(80);   // NOT 800
      expect(rounds[1].team_scores[1]).toBe(82);   // NOT 820
      expect(rounds[2].team_scores[0]).toBe(120);  // NOT 1200
      expect(rounds[2].team_scores[1]).toBe(42);   // NOT 420
    });
  });

  describe('Edge Cases', () => {
    it('should handle edge case scores like single digits correctly', async () => {
      // Test specifically for the reported bug case
      const { db } = await import('../../../lib/database');
      jest.mocked(db.prepare).mockImplementation((sql: string) => {
        if (sql.includes('SUM(CASE WHEN players.position IN (0, 2)')) {
          return {
            all: jest.fn().mockReturnValue([
              { 
                round_number: 1, 
                details: '{"trump":"hearts","taker_team":0}',
                team1_total: 160, 
                team2_total: 2    // Single digit - this was becoming 20!
              }
            ])
          };
        }
        return {
          get: jest.fn().mockReturnValue(mockBeloteSessionData),
          all: jest.fn().mockReturnValue(mockPlayers),
          run: jest.fn().mockReturnValue({ changes: 1 })
        };
      });
      
      const getRequest = new NextRequest('http://localhost:3000/api/games/belote/sessions/123');
      const getResponse = await getBeloteSession(getRequest, { params: Promise.resolve({ sessionId: '123' }) });
      
      const data = await getResponse.json();
      const round = data.session.rounds[0];
      
      // This is the exact bug case reported by the user
      expect(round.team_scores[0]).toBe(160);  // Was showing as 1600 
      expect(round.team_scores[1]).toBe(2);    // Was showing as 20
    });
  });
});