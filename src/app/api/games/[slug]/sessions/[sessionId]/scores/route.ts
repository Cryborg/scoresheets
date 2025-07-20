import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; sessionId: string } }
) {
  try {
    await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const { sessionId, slug } = params;
    const { categoryId, playerId, score } = await request.json();

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

    // Check if score already exists
    const existingScore = await db.prepare(`
      SELECT id FROM scores
      WHERE session_id = ? AND player_id = ? AND score_type = ?
    `).get(sessionId, playerId, categoryId);

    if (existingScore) {
      // Update existing score
      await db.prepare(`
        UPDATE scores
        SET score_value = ?
        WHERE session_id = ? AND player_id = ? AND score_type = ?
      `).run(score, sessionId, playerId, categoryId);
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