import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
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
    const body = await request.json();
    const { round_number, team_scores, details } = body;

    // Verify session ownership
    const session = await db.prepare(`
      SELECT gs.id
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.id = ? AND gs.user_id = ? AND g.slug = 'belote'
    `).get(sessionId, userId);

    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    // Get players for this session
    const players = await db.prepare(`
      SELECT id, position
      FROM players
      WHERE session_id = ?
      ORDER BY position
    `).all(sessionId) as { id: number; position: number }[];

    if (players.length !== 4) {
      return NextResponse.json({ error: 'Il faut exactement 4 joueurs pour la Belote' }, { status: 400 });
    }

    // Clear existing scores for this round
    await db.prepare(`
      DELETE FROM scores 
      WHERE session_id = ? AND round_number = ?
    `).run(sessionId, round_number);

    // Add scores for each player based on their team
    const insertScore = await db.prepare(`
      INSERT INTO scores (session_id, player_id, round_number, score_type, score_value, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const detailsJson = details ? JSON.stringify(details) : null;

    // Team 1 (positions 0 and 2) gets team_scores[0] / 2 each
    const team1ScorePerPlayer = (team_scores[0] || 0) / 2;
    for (const player of players.filter(p => p.position === 0 || p.position === 2)) {
      await insertScore.run(
        sessionId,
        player.id,
        round_number,
        'round_score',
        team1ScorePerPlayer,
        detailsJson
      );
    }

    // Team 2 (positions 1 and 3) gets team_scores[1] / 2 each  
    const team2ScorePerPlayer = (team_scores[1] || 0) / 2;
    for (const player of players.filter(p => p.position === 1 || p.position === 3)) {
      await insertScore.run(
        sessionId,
        player.id,
        round_number,
        'round_score',
        team2ScorePerPlayer,
        detailsJson
      );
    }

    return NextResponse.json({
      message: 'Tour ajouté avec succès',
      round_number
    });
  } catch (error) {
    console.error('Error adding Belote round:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}