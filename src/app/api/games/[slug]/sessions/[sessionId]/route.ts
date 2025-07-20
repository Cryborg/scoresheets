import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sessionId: string }> }
) {
  try {
    await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const { sessionId, slug } = await params;

    // Get game info
    const game = await db.prepare('SELECT * FROM games WHERE slug = ?').get(slug) as any;
    if (!game) {
      return NextResponse.json({ error: 'Jeu non trouvé' }, { status: 404 });
    }

    // Get session with players
    const session = await db.prepare(`
      SELECT 
        gs.id,
        gs.session_name,
        gs.game_id,
        gs.date_played,
        gs.has_score_target,
        gs.score_target,
        gs.finish_current_round
      FROM game_sessions gs
      WHERE gs.id = ? AND gs.user_id = ?
    `).get(sessionId, userId) as any;

    if (!session) {
      return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
    }

    // Get players
    const players = await db.prepare(`
      SELECT id, name, position
      FROM players
      WHERE session_id = ?
      ORDER BY position
    `).all(sessionId);

    // Initialize response
    let sessionData: any = {
      id: session.id,
      session_name: session.session_name,
      has_score_target: session.has_score_target,
      score_target: session.score_target,
      finish_current_round: session.finish_current_round,
      score_direction: game.score_direction || 'higher', // Get from game definition
      players,
      scores: {},
      rounds: []
    };

    // Handle different score types
    if (game.score_type === 'categories') {
      // For games like Yams with categories
      const scoreQuery = await db.prepare(`
        SELECT 
          s.player_id,
          s.score_type as category_id,
          s.score_value
        FROM scores s
        WHERE s.session_id = ?
      `);

      const scores = await scoreQuery.all(sessionId) as any[];

      sessionData.scores = scores.reduce((acc: any, score: any) => {
        if (!acc[score.category_id]) {
          acc[score.category_id] = {};
        }
        acc[score.category_id][score.player_id] = score.score_value;
        return acc;
      }, {});
    } else {
      // For games with rounds (Rami, Belotte, etc.)
      const roundsQuery = await db.prepare(`
        SELECT DISTINCT round_number
        FROM scores
        WHERE session_id = ?
        ORDER BY round_number
      `);

      const rounds = await roundsQuery.all(sessionId) as any[];

      sessionData.rounds = [];
      for (const round of rounds) {
        const roundScores = await db.prepare(`
          SELECT player_id, score_value
          FROM scores
          WHERE session_id = ? AND round_number = ?
        `).all(sessionId, round.round_number) as any[];

        const scores = roundScores.reduce((acc: any, score: any) => {
          acc[score.player_id] = score.score_value;
          return acc;
        }, {});

        sessionData.rounds.push({
          round_number: round.round_number,
          scores
        });
      }
    }

    return NextResponse.json({ session: sessionData });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}