import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';

export async function GET() {
  try {
    await initializeDatabase();
    
    const games = await db.prepare(`
      SELECT 
        g.id,
        g.name,
        g.slug,
        g.rules,
        g.is_implemented,
        g.score_type,
        g.team_based,
        g.min_players,
        g.max_players,
        g.use_generic_scoring,
        gc.name as category_name
      FROM games g
      JOIN game_categories gc ON g.category_id = gc.id
      WHERE g.show_in_list = TRUE
      ORDER BY gc.name, g.name
    `).all();

    return NextResponse.json({ games });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}