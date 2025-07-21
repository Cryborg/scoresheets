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
        GROUP_CONCAT(
          CASE 
            WHEN players.position IN (0, 2) THEN score_value 
            ELSE NULL 
          END
        ) as team1_scores,
        GROUP_CONCAT(
          CASE 
            WHEN players.position IN (1, 3) THEN score_value 
            ELSE NULL 
          END
        ) as team2_scores
      FROM scores
      LEFT JOIN players ON scores.player_id = players.id
      WHERE scores.session_id = ?
      GROUP BY round_number
      ORDER BY round_number
    `).all(sessionId);

    // Transform rounds data
    const rounds = roundsData.map((round: { round_number: number; details: string | null; team1_scores: string | null; team2_scores: string | null }) => {
      const team1Scores = round.team1_scores ? round.team1_scores.split(',').map((s: string) => parseInt(s) || 0) : [0, 0];
      const team2Scores = round.team2_scores ? round.team2_scores.split(',').map((s: string) => parseInt(s) || 0) : [0, 0];
      
      const team1Total = team1Scores.reduce((sum: number, score: number) => sum + score, 0);
      const team2Total = team2Scores.reduce((sum: number, score: number) => sum + score, 0);

      let details = null;
      try {
        details = round.details ? JSON.parse(round.details) : null;
      } catch {
        // Invalid JSON, ignore
      }

      return {
        round_number: round.round_number,
        team_scores: {
          0: team1Total,
          1: team2Total
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