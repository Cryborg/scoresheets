import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { sessionName, players, teams, hasScoreTarget, scoreTarget, finishCurrentRound } = body;
    const { slug } = await params;
    
    console.log('Create session request:', { slug, ...body });

    // Get game info
    const game = await db.prepare('SELECT * FROM games WHERE slug = ?').get(slug) as any;
    if (!game) {
      return NextResponse.json({ error: 'Jeu non trouvé' }, { status: 404 });
    }

    if (!game.is_implemented) {
      return NextResponse.json({ error: 'Jeu non implémenté' }, { status: 400 });
    }

    // Validate players based on game configuration
    const allPlayers = game.team_based 
      ? teams?.flatMap((team: any) => team.players).filter((p: string) => p.trim()) || []
      : players?.filter((p: string) => p.trim()) || [];

    if (allPlayers.length < game.min_players || allPlayers.length > game.max_players) {
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
    const insertSession = await db.prepare(`
      INSERT INTO game_sessions (user_id, game_id, session_name, has_score_target, score_target, finish_current_round)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const sessionResult = await insertSession.run(
      userId, 
      game.id, 
      sessionName || `Partie de ${game.name}`, 
      hasScoreTarget ? 1 : 0,  // Convert boolean to 0/1 for SQLite
      hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null, 
      hasScoreTarget && finishCurrentRound ? 1 : 0  // Convert boolean to 0/1
    );
    const sessionId = sessionResult.lastInsertRowid;

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
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}