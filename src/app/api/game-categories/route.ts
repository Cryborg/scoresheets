import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';

export async function GET() {
  try {
    await initializeDatabase();
    
    const categories = await db.prepare(`
      SELECT id, name
      FROM game_categories
      ORDER BY name
    `).all();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}