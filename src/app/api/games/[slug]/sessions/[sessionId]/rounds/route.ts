import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
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
    const { scores } = await request.json();

    // Verify session ownership
    const session = await db.prepare(`
      SELECT gs.id 
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.id = ? AND gs.user_id = ? AND g.slug = ?
    `).get(sessionId, userId, slug);

    if (!session) {
      return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
    }

    // Get the next round number
    const lastRound = await db.prepare(`
      SELECT MAX(round_number) as max_round
      FROM scores
      WHERE session_id = ?
    `).get(sessionId) as any;

    const roundNumber = (lastRound?.max_round || 0) + 1;

    // Insert scores for this round
    const insertScore = await db.prepare(`
      INSERT INTO scores (session_id, player_id, round_number, score_type, score_value)
      VALUES (?, ?, ?, 'round', ?)
    `);

    // Process scores sequentially for async database
    for (const score of scores) {
      await insertScore.run(sessionId, score.playerId, roundNumber, score.score);
    }

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