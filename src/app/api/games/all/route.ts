import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    await initializeDatabase();
    
    const games = await db.prepare(`
      SELECT 
        g.id,
        g.name,
        g.slug,
        g.score_type,
        g.team_based,
        g.min_players,
        g.max_players
      FROM games g
      ORDER BY g.name
    `).all();

    return NextResponse.json({ games });
  } catch (error) {
    console.error('Error fetching all games:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}