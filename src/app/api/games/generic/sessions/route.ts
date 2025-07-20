import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { sessionName, players, hasScoreTarget, scoreTarget, finishCurrentRound, scoreDirection } = body;
    
    console.log('Create generic session request:', body);

    // Validate players
    const validPlayers = players?.filter((p: string) => p.trim()) || [];
    
    if (validPlayers.length < 2) {
      return NextResponse.json(
        { error: 'Il faut au moins 2 joueurs' },
        { status: 400 }
      );
    }

    if (validPlayers.length > 8) {
      return NextResponse.json(
        { error: 'Maximum 8 joueurs' },
        { status: 400 }
      );
    }

    // Create session directly (without game reference for generic sessions)
    const insertSession = db.prepare(`
      INSERT INTO game_sessions (user_id, game_id, session_name, has_score_target, score_target, finish_current_round, score_direction)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const sessionResult = insertSession.run(
      userId, 
      null, // game_id = NULL for generic sessions
      sessionName || 'Partie avec scores simples', 
      hasScoreTarget ? 1 : 0,  // Convert boolean to 0/1 for SQLite
      hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null, 
      hasScoreTarget && finishCurrentRound ? 1 : 0,  // Convert boolean to 0/1
      scoreDirection || 'higher'  // Default to 'higher' if not specified
    );
    const sessionId = sessionResult.lastInsertRowid;

    // Add players
    const insertPlayer = db.prepare(`
      INSERT INTO players (session_id, name, position)
      VALUES (?, ?, ?)
    `);

    let position = 0;
    validPlayers.forEach((playerName: string) => {
      if (playerName.trim()) {
        insertPlayer.run(sessionId, playerName.trim(), position);
        position++;
      }
    });

    // Save player names to user's frequent players
    const updatePlayerStats = db.prepare(`
      INSERT INTO user_players (user_id, player_name) 
      VALUES (?, ?)
      ON CONFLICT(user_id, player_name) DO UPDATE SET
        games_played = games_played + 1,
        last_played = CURRENT_TIMESTAMP
    `);

    const transaction = db.transaction(() => {
      validPlayers.forEach((playerName: string) => {
        if (playerName.trim()) {
          updatePlayerStats.run(userId, playerName.trim());
        }
      });
    });

    transaction();

    return NextResponse.json({
      message: 'Partie créée avec succès',
      sessionId
    });
  } catch (error) {
    console.error('Create generic session error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}