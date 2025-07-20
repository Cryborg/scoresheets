import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';

function getUserIdFromRequest(request: NextRequest): number | null {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    
    const players = await db.prepare(`
      SELECT player_name, games_played, last_played 
      FROM user_players 
      WHERE user_id = ? 
      ORDER BY games_played DESC, last_played DESC
    `).all(userId);

    return NextResponse.json({ players });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    
    const { playerNames } = await request.json();
    
    if (!Array.isArray(playerNames)) {
      return NextResponse.json({ error: 'Format invalide' }, { status: 400 });
    }

    const stmt = await db.prepare(`
      INSERT INTO user_players (user_id, player_name) 
      VALUES (?, ?)
      ON CONFLICT(user_id, player_name) DO UPDATE SET
        games_played = games_played + 1,
        last_played = CURRENT_TIMESTAMP
    `);

    for (const name of playerNames) {
      if (name.trim()) {
        await stmt.run(userId, name.trim());
      }
    }

    return NextResponse.json({ message: 'Joueurs enregistrés' });
  } catch (error) {
    console.error('Error saving players:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}