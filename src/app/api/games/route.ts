import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    console.log('API /api/games: Starting request');
    await initializeDatabase();
    console.log('API /api/games: Database initialized');
    
    const result = await db.execute(`
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
        g.score_direction,
        gc.name as category_name
      FROM games g
      JOIN game_categories gc ON g.category_id = gc.id
      ORDER BY gc.name, g.name
    `);

    const games = result.rows;

    console.log('API /api/games: Found games:', games.length);
    console.log('API /api/games: Game slugs:', games.map((g) => (g as { slug: string }).slug));
    return NextResponse.json({ games });
  } catch (error) {
    console.error('API /api/games: Error fetching games:', error);
    console.error('API /api/games: Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}