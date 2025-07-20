import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const { sessionId } = await params;
    const { scores } = await request.json();

    // Verify session ownership (for generic sessions, game_id is NULL)
    const session = db.prepare(`
      SELECT gs.id 
      FROM game_sessions gs
      WHERE gs.id = ? AND gs.user_id = ? AND gs.game_id IS NULL
    `).get(sessionId, userId);

    if (!session) {
      return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
    }

    // Get the next round number
    const lastRound = db.prepare(`
      SELECT MAX(round_number) as max_round
      FROM scores
      WHERE session_id = ?
    `).get(sessionId) as any;

    const roundNumber = (lastRound?.max_round || 0) + 1;

    // Insert scores for this round
    const insertScore = db.prepare(`
      INSERT INTO scores (session_id, player_id, round_number, score_type, score_value)
      VALUES (?, ?, ?, 'round', ?)
    `);

    const transaction = db.transaction(() => {
      scores.forEach((score: { playerId: number; score: number }) => {
        insertScore.run(sessionId, score.playerId, roundNumber, score.score);
      });
    });

    transaction();

    return NextResponse.json({ 
      message: 'Manche enregistrée',
      roundNumber 
    });
  } catch (error) {
    console.error('Save generic round error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}