import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { sessionName, players, teams, hasScoreTarget, scoreTarget, finishCurrentRound } = body;
    const { slug } = await params;
    
    console.log('Create session request:', { slug, ...body });

    // Get game info
    const game = db.prepare('SELECT * FROM games WHERE slug = ?').get(slug) as any;
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
    const insertSession = db.prepare(`
      INSERT INTO game_sessions (user_id, game_id, session_name, has_score_target, score_target, finish_current_round)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const sessionResult = insertSession.run(
      userId, 
      game.id, 
      sessionName || `Partie de ${game.name}`, 
      hasScoreTarget ? 1 : 0,  // Convert boolean to 0/1 for SQLite
      hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null, 
      hasScoreTarget && finishCurrentRound ? 1 : 0  // Convert boolean to 0/1
    );
    const sessionId = sessionResult.lastInsertRowid;

    // Add players
    const insertPlayer = db.prepare(`
      INSERT INTO players (session_id, name, position)
      VALUES (?, ?, ?)
    `);

    let position = 0;
    if (game.team_based && teams) {
      teams.forEach((team: any) => {
        team.players.forEach((playerName: string) => {
          if (playerName.trim()) {
            insertPlayer.run(sessionId, playerName.trim(), position);
            position++;
          }
        });
      });
    } else if (players) {
      players.forEach((playerName: string) => {
        if (playerName.trim()) {
          insertPlayer.run(sessionId, playerName.trim(), position);
          position++;
        }
      });
    }

    // Save player names to user's frequent players
    const updatePlayerStats = db.prepare(`
      INSERT INTO user_players (user_id, player_name) 
      VALUES (?, ?)
      ON CONFLICT(user_id, player_name) DO UPDATE SET
        games_played = games_played + 1,
        last_played = CURRENT_TIMESTAMP
    `);

    const transaction = db.transaction(() => {
      allPlayers.forEach((playerName: string) => {
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
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}