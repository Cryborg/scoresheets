import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; sessionId: string } }
) {
  try {
    // Skip initializeDatabase() - it's already initialized on first call
    // await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const { sessionId, slug } = params;
    const { categoryId, playerId, score } = await request.json();

    // Single optimized query: verify session ownership + get existing score in one go
    const sessionAndScore = await db.prepare(`
      SELECT 
        gs.id as session_id,
        s.id as existing_score_id
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      LEFT JOIN scores s ON s.session_id = gs.id AND s.player_id = ? AND s.score_type = ?
      WHERE gs.id = ? AND gs.user_id = ? AND g.slug = ?
    `).get(playerId, categoryId, sessionId, userId, slug);

    if (!sessionAndScore) {
      return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
    }

    // Optimized: single query based on existing score
    if (sessionAndScore.existing_score_id) {
      // Update existing score
      await db.prepare(`
        UPDATE scores SET score_value = ? WHERE id = ?
      `).run(score, sessionAndScore.existing_score_id);
    } else {
      // Insert new score
      await db.prepare(`
        INSERT INTO scores (session_id, player_id, round_number, score_type, score_value)
        VALUES (?, ?, 0, ?, ?)
      `).run(sessionId, playerId, categoryId, score);
    }

    return NextResponse.json({ message: 'Score enregistré' });
  } catch (error) {
    console.error('Save score error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}