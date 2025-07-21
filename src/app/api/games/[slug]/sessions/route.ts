import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Log détaillé pour production
    console.log('=== PRODUCTION REQUEST LOG ===');
    console.log('API /api/games/[slug]/sessions: Starting POST request');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Timestamp:', new Date().toISOString());
    console.log('=== END PRODUCTION REQUEST LOG ===');
    
    await initializeDatabase();
    console.log('[PROD] Database initialized');
    
    const userId = getAuthenticatedUserId(request);
    console.log('[PROD] User ID:', userId);
    
    if (!userId) {
      console.log('[PROD] No user ID, returning unauthorized');
      return unauthorizedResponse();
    }

    const body = await request.json();
    console.log('[PROD] Request body:', JSON.stringify(body, null, 2));
    const { sessionName, players, teams, hasScoreTarget, scoreTarget, finishCurrentRound } = body;
    const { slug } = await params;
    console.log('[PROD] Slug:', slug);
    
    console.log('[PROD] Create session request:', JSON.stringify({ slug, ...body }, null, 2));

    // Get game info
    console.log('[PROD] Fetching game with slug:', slug);
    const game = await db.prepare('SELECT * FROM games WHERE slug = ?').get(slug) as {
      id: number;
      name: string;
      slug: string;
      is_implemented: number;
      team_based: number;
      min_players: number;
      max_players: number;
      score_direction: string;
    } | undefined;
    console.log('[PROD] Game found:', JSON.stringify(game, null, 2));
    if (!game) {
      console.log('[PROD] Game not found');
      return NextResponse.json({ error: 'Jeu non trouvé' }, { status: 404 });
    }

    if (!game.is_implemented) {
      console.log('[PROD] Game not implemented');
      return NextResponse.json({ error: 'Jeu non implémenté' }, { status: 400 });
    }

    // Validate players based on game configuration
    console.log('[PROD] Validating players, team_based:', game.team_based);
    const allPlayers = game.team_based 
      ? teams?.flatMap((team: { players: string[] }) => team.players).filter((p: string) => p.trim()) || []
      : players?.filter((p: string) => p.trim()) || [];
    console.log('[PROD] All players:', JSON.stringify(allPlayers, null, 2));

    if (allPlayers.length < game.min_players || allPlayers.length > game.max_players) {
      console.log(`[PROD] Invalid player count: ${allPlayers.length}, required: ${game.min_players}-${game.max_players}`);
      return NextResponse.json(
        { error: `Il faut entre ${game.min_players} et ${game.max_players} joueurs` },
        { status: 400 }
      );
    }

    if (game.team_based && teams) {
      const expectedTeams = game.max_players / 2;
      if (teams.length !== expectedTeams || teams.some((team: { players: string[] }) => team.players.length !== 2)) {
        return NextResponse.json(
          { error: `Il faut ${expectedTeams} équipes de 2 joueurs` },
          { status: 400 }
        );
      }
    }

    // Create session
    console.log('[PROD] Creating session');
    const insertSession = await db.prepare(`
      INSERT INTO game_sessions (user_id, game_id, session_name, has_score_target, score_target, finish_current_round, score_direction)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const sessionParams = {
      userId, 
      gameId: game.id, 
      sessionName: sessionName || `Partie de ${game.name}`, 
      hasScoreTarget: hasScoreTarget ? 1 : 0,
      scoreTarget: hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null, 
      finishCurrentRound: hasScoreTarget && finishCurrentRound ? 1 : 0,
      scoreDirection: game.score_direction || 'higher'
    };
    console.log('[PROD] Session parameters:', JSON.stringify(sessionParams, null, 2));

    // Safely handle scoreTarget to avoid NaN
    let safeScoreTarget = null;
    if (hasScoreTarget && scoreTarget) {
      const parsed = parseInt(scoreTarget);
      safeScoreTarget = isNaN(parsed) ? null : parsed;
    }
    
    console.log('[PROD] Safe parameters before insert:', {
      userId,
      gameId: game.id,
      sessionName: sessionName || `Partie de ${game.name}`,
      hasScoreTarget: hasScoreTarget ? 1 : 0,
      safeScoreTarget,
      finishCurrentRound: hasScoreTarget && finishCurrentRound ? 1 : 0,
      scoreDirection: game.score_direction || 'higher'
    });

    const sessionResult = await insertSession.run(
      userId, 
      game.id, 
      sessionName || `Partie de ${game.name}`, 
      hasScoreTarget ? 1 : 0,  // Convert boolean to 0/1 for SQLite
      safeScoreTarget, 
      hasScoreTarget && finishCurrentRound ? 1 : 0,  // Convert boolean to 0/1
      game.score_direction || 'higher'
    );
    
    console.log('[PROD] Session result:', JSON.stringify(sessionResult, null, 2));
    
    // Handle Turso's lastInsertRowid issue
    let sessionId = sessionResult.lastInsertRowid;
    if (typeof sessionId === 'bigint') {
      sessionId = Number(sessionId);
    }
    
    // If Turso returns null for lastInsertRowid, fetch the ID manually
    if (!sessionId || sessionId === null || isNaN(sessionId)) {
      console.log('[PROD] Turso returned null lastInsertRowid, fetching ID manually');
      const lastSession = await db.prepare(`
        SELECT id FROM game_sessions 
        WHERE user_id = ? AND session_name = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(userId, sessionName || `Partie de ${game.name}`);
      
      console.log('[PROD] Manual fetch result:', lastSession);
      
      if (lastSession && lastSession.id) {
        sessionId = Number(lastSession.id);
      } else {
        console.error('[PROD] Could not retrieve session ID after insert');
        return NextResponse.json(
          { error: 'Erreur lors de la création de la session' },
          { status: 500 }
        );
      }
    }
    
    console.log('[PROD] Session created with ID:', sessionId);

    // Add players
    const insertPlayer = await db.prepare(`
      INSERT INTO players (session_id, name, position)
      VALUES (?, ?, ?)
    `);

    let position = 0;
    if (game.team_based && teams) {
      for (const team of teams) {
        for (const playerName of team.players) {
          if (playerName.trim()) {
            await insertPlayer.run(sessionId, playerName.trim(), position);
            position++;
          }
        }
      }
    } else if (players) {
      for (const playerName of players) {
        if (playerName.trim()) {
          await insertPlayer.run(sessionId, playerName.trim(), position);
          position++;
        }
      }
    }

    // Save player names to user's frequent players
    const updatePlayerStats = await db.prepare(`
      INSERT INTO user_players (user_id, player_name) 
      VALUES (?, ?)
      ON CONFLICT(user_id, player_name) DO UPDATE SET
        games_played = games_played + 1,
        last_played = CURRENT_TIMESTAMP
    `);

    // Save player names to user's frequent players
    for (const playerName of allPlayers) {
      if (playerName.trim()) {
        await updatePlayerStats.run(userId, playerName.trim());
      }
    }

    return NextResponse.json({
      message: 'Partie créée avec succès',
      sessionId
    });
  } catch (error) {
    // Logs spéciaux pour Vercel production
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method
    };
    
    console.error('=== PRODUCTION ERROR LOG ===');
    console.error('API /api/games/[slug]/sessions: Create session error:', JSON.stringify(errorDetails, null, 2));
    console.error('=== END PRODUCTION ERROR LOG ===');
    
    // Log également l'erreur brute
    console.error('Raw error:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur serveur', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: errorDetails.timestamp
      },
      { status: 500 }
    );
  }
}