import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return unauthorizedResponse();
    }

    const { sessionId } = await params;

    // Get session with game info
    const session = await db.prepare(`
      SELECT gs.*, g.name as game_name, g.slug as game_slug
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.id = ? AND gs.user_id = ? AND g.slug = 'belote'
    `).get(sessionId, userId) as {
      id: number;
      session_name: string;
      score_target?: number;
      game_name: string;
      game_slug: string;
    } | undefined;

    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    // Get players
    const players = await db.prepare(`
      SELECT id, name, position
      FROM players
      WHERE session_id = ?
      ORDER BY position
    `).all(sessionId);

    // Get rounds with team scores
    const roundsData = await db.prepare(`
      SELECT 
        round_number,
        details,
        SUM(CASE WHEN players.position IN (0, 2) THEN score_value ELSE 0 END) as team1_total,
        SUM(CASE WHEN players.position IN (1, 3) THEN score_value ELSE 0 END) as team2_total
      FROM scores
      JOIN players ON scores.player_id = players.id
      WHERE scores.session_id = ?
      GROUP BY round_number, details
      ORDER BY round_number
    `).all(sessionId);

    // Transform rounds data
    const rounds = roundsData.map((round: { round_number: number; details: string | null; team1_total: number; team2_total: number }) => {

      let details = null;
      try {
        details = round.details ? JSON.parse(round.details) : null;
      } catch {
        // Invalid JSON, ignore
      }

      return {
        round_number: round.round_number,
        team_scores: {
          0: round.team1_total || 0,
          1: round.team2_total || 0
        },
        details
      };
    });

    return NextResponse.json({
      session: {
        ...session,
        players,
        rounds
      }
    });
  } catch (error) {
    console.error('Error fetching Belote session:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}