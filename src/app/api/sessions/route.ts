import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const sessions = await db.prepare(`
      SELECT 
        gs.id,
        gs.session_name,
        gs.date_played,
        COALESCE(g.name, 'Scores simples') as game_name,
        gs.game_id,
        COUNT(DISTINCT p.id) as player_count,
        (
          SELECT GROUP_CONCAT(
            p2.name || ': ' || 
            COALESCE((SELECT SUM(score_value) FROM scores WHERE player_id = p2.id AND session_id = gs.id), 0)
            || ' pts',
            ' | '
          )
          FROM players p2 
          WHERE p2.session_id = gs.id
          ORDER BY p2.position
        ) as scores_summary
      FROM game_sessions gs
      LEFT JOIN games g ON gs.game_id = g.id
      LEFT JOIN players p ON gs.id = p.session_id
      WHERE gs.user_id = ?
      GROUP BY gs.id, gs.session_name, gs.date_played, g.name, gs.game_id
      ORDER BY gs.date_played DESC
      LIMIT 10
    `).all(userId);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Sessions error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}