import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sessionId: string }> }
) {
  try {
    // Skip initializeDatabase() - it's already initialized
    // await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const { sessionId, slug } = await params;
    const { scores } = await request.json();

    // Combined query: verify session ownership + get next round number
    const sessionAndRound = await db.prepare(`
      SELECT 
        gs.id as session_id,
        COALESCE(MAX(s.round_number), 0) + 1 as next_round
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      LEFT JOIN scores s ON s.session_id = gs.id
      WHERE gs.id = ? AND gs.user_id = ? AND g.slug = ?
      GROUP BY gs.id
    `).get(sessionId, userId, slug);

    if (!sessionAndRound) {
      return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
    }

    const roundNumber = sessionAndRound.next_round;

    // Batch insert scores - prepare statement once, execute multiple times
    const insertScore = await db.prepare(`
      INSERT INTO scores (session_id, player_id, round_number, score_type, score_value)
      VALUES (?, ?, ?, 'round', ?)
    `);

    // Use Promise.all for parallel execution (if database supports it)
    await Promise.all(
      scores.map((score: { playerId: number; score: number }) => 
        insertScore.run(sessionId, score.playerId, roundNumber, score.score)
      )
    );

    return NextResponse.json({ 
      message: 'Manche enregistrée',
      roundNumber 
    });
  } catch (error) {
    console.error('Save round error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}