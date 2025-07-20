import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    console.log('API /api/games/[slug]/sessions: Starting POST request');
    await initializeDatabase();
    console.log('API /api/games/[slug]/sessions: Database initialized');
    
    const userId = getAuthenticatedUserId(request);
    console.log('API /api/games/[slug]/sessions: User ID:', userId);
    
    if (!userId) {
      console.log('API /api/games/[slug]/sessions: No user ID, returning unauthorized');
      return unauthorizedResponse();
    }

    const body = await request.json();
    console.log('API /api/games/[slug]/sessions: Request body:', body);
    const { sessionName, players, teams, hasScoreTarget, scoreTarget, finishCurrentRound } = body;
    const { slug } = await params;
    console.log('API /api/games/[slug]/sessions: Slug:', slug);
    
    console.log('Create session request:', { slug, ...body });

    // Get game info
    console.log('API /api/games/[slug]/sessions: Fetching game with slug:', slug);
    const game = await db.prepare('SELECT * FROM games WHERE slug = ?').get(slug) as any;
    console.log('API /api/games/[slug]/sessions: Game found:', game);
    if (!game) {
      console.log('API /api/games/[slug]/sessions: Game not found');
      return NextResponse.json({ error: 'Jeu non trouvé' }, { status: 404 });
    }

    if (!game.is_implemented) {
      console.log('API /api/games/[slug]/sessions: Game not implemented');
      return NextResponse.json({ error: 'Jeu non implémenté' }, { status: 400 });
    }

    // Validate players based on game configuration
    console.log('API /api/games/[slug]/sessions: Validating players, game.team_based:', game.team_based);
    const allPlayers = game.team_based 
      ? teams?.flatMap((team: any) => team.players).filter((p: string) => p.trim()) || []
      : players?.filter((p: string) => p.trim()) || [];
    console.log('API /api/games/[slug]/sessions: All players:', allPlayers);

    if (allPlayers.length < game.min_players || allPlayers.length > game.max_players) {
      console.log(`API /api/games/[slug]/sessions: Invalid player count: ${allPlayers.length}, required: ${game.min_players}-${game.max_players}`);
      return NextResponse.json(
        { error: `Il faut entre ${game.min_players} et ${game.max_players} joueurs` },
        { status: 400 }
      );
    }

    if (game.team_based && teams) {
      const expectedTeams = game.max_players / 2;
      if (teams.length !== expectedTeams || teams.some((team: any) => team.players.length !== 2)) {
        return NextResponse.json(
          { error: `Il faut ${expectedTeams} équipes de 2 joueurs` },
          { status: 400 }
        );
      }
    }

    // Create session
    console.log('API /api/games/[slug]/sessions: Creating session');
    const insertSession = await db.prepare(`
      INSERT INTO game_sessions (user_id, game_id, session_name, has_score_target, score_target, finish_current_round, score_direction)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    console.log('API /api/games/[slug]/sessions: Session parameters:', {
      userId, 
      gameId: game.id, 
      sessionName: sessionName || `Partie de ${game.name}`, 
      hasScoreTarget: hasScoreTarget ? 1 : 0,
      scoreTarget: hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null, 
      finishCurrentRound: hasScoreTarget && finishCurrentRound ? 1 : 0,
      scoreDirection: game.score_direction || 'higher'
    });

    const sessionResult = await insertSession.run(
      userId, 
      game.id, 
      sessionName || `Partie de ${game.name}`, 
      hasScoreTarget ? 1 : 0,  // Convert boolean to 0/1 for SQLite
      hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null, 
      hasScoreTarget && finishCurrentRound ? 1 : 0,  // Convert boolean to 0/1
      game.score_direction || 'higher'
    );
    const sessionId = sessionResult.lastInsertRowid;
    console.log('API /api/games/[slug]/sessions: Session created with ID:', sessionId);

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
    console.error('API /api/games/[slug]/sessions: Create session error:', error);
    console.error('API /api/games/[slug]/sessions: Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('API /api/games/[slug]/sessions: Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}