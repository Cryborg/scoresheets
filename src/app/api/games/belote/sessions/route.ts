import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { sessionName, teams, hasScoreTarget, scoreTarget, finishCurrentRound } = body;
    
    // Validation pour la belote (exactement 4 joueurs en 2 équipes)
    if (!teams || teams.length !== 2) {
      return NextResponse.json({ error: 'Il faut exactement 2 équipes' }, { status: 400 });
    }
    
    const allPlayers = teams.flatMap((team: { players: string[] }) => team.players).filter((p: string) => p.trim());
    if (allPlayers.length !== 4) {
      return NextResponse.json({ error: 'Il faut exactement 4 joueurs (2 par équipe)' }, { status: 400 });
    }

    // Get game info
    const game = await db.prepare('SELECT * FROM games WHERE slug = ?').get('belote') as {
      id: number;
      name: string;
      score_direction: string;
    } | undefined;
    
    if (!game) {
      return NextResponse.json({ error: ERROR_MESSAGES.NOT_FOUND }, { status: HTTP_STATUS.NOT_FOUND });
    }

    // Create session
    const insertSession = await db.prepare(`
      INSERT INTO game_sessions (user_id, game_id, session_name, has_score_target, score_target, finish_current_round, score_direction)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const sessionResult = await insertSession.run(
      userId, 
      game.id, 
      sessionName || `Partie de ${game.name}`, 
      hasScoreTarget ? 1 : 0,
      hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null, 
      hasScoreTarget && finishCurrentRound ? 1 : 0,
      game.score_direction || 'higher'
    );
    
    let sessionId = sessionResult.lastInsertRowid;
    if (typeof sessionId === 'bigint') {
      sessionId = Number(sessionId);
    }
    
    // Handle Turso's lastInsertRowid issue
    if (!sessionId || sessionId === null || isNaN(sessionId)) {
      const lastSession = await db.prepare(`
        SELECT id FROM game_sessions 
        WHERE user_id = ? AND session_name = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(userId, sessionName || `Partie de ${game.name}`);
      
      if (lastSession && lastSession.id) {
        sessionId = Number(lastSession.id);
      } else {
        return NextResponse.json(
          { error: ERROR_MESSAGES.DATABASE_ERROR },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    }

    // Add players (organiser en équipes : 0,2 vs 1,3)
    const insertPlayer = await db.prepare(`
      INSERT INTO players (session_id, name, position)
      VALUES (?, ?, ?)
    `);

    // Équipe 1 : positions 0 et 2
    await insertPlayer.run(sessionId, teams[0].players[0].trim(), 0);
    await insertPlayer.run(sessionId, teams[0].players[1].trim(), 2);
    
    // Équipe 2 : positions 1 et 3  
    await insertPlayer.run(sessionId, teams[1].players[0].trim(), 1);
    await insertPlayer.run(sessionId, teams[1].players[1].trim(), 3);

    // Save player names to user's frequent players
    const updatePlayerStats = await db.prepare(`
      INSERT INTO user_players (user_id, player_name) 
      VALUES (?, ?)
      ON CONFLICT(user_id, player_name) DO UPDATE SET
        games_played = games_played + 1,
        last_played = CURRENT_TIMESTAMP
    `);

    for (const playerName of allPlayers) {
      if (playerName.trim()) {
        await updatePlayerStats.run(userId, playerName.trim());
      }
    }

    return NextResponse.json({
      message: 'Partie de Belote créée avec succès',
      sessionId
    });
  } catch (error) {
    console.error('Error creating Belote session:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}