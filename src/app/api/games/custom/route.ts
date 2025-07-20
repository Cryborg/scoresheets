import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database-async';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { name, slug, categoryId, rules, teamBased, minPlayers, maxPlayers, scoreDirection } = body;

    console.log('Create game request:', body);

    if (!name || !slug || !categoryId) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    // Validate types
    if (typeof categoryId !== 'number' && typeof categoryId !== 'string') {
      return NextResponse.json({ error: 'ID de catégorie invalide' }, { status: 400 });
    }

    // Vérifier que le slug n'existe pas déjà
    const existingGame = await db.prepare('SELECT id FROM games WHERE slug = ?').get(slug);
    if (existingGame) {
      return NextResponse.json({ error: 'Un jeu avec ce nom existe déjà' }, { status: 400 });
    }

    // Vérifier que la catégorie existe
    const category = await db.prepare('SELECT id FROM game_categories WHERE id = ?').get(categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
    }

    // Créer le jeu
    const insertGame = await db.prepare(`
      INSERT INTO games (
        name, 
        slug, 
        category_id, 
        rules, 
        is_implemented, 
        score_type, 
        team_based, 
        min_players, 
        max_players, 
        score_direction
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await insertGame.run(
      name,
      slug,
      parseInt(categoryId),
      rules || '',
      1, // is_implemented (1 for true in SQLite)
      'rounds', // score_type
      teamBased ? 1 : 0, // Convert boolean to 0/1 for SQLite
      parseInt(minPlayers) || 2,
      parseInt(maxPlayers) || 6,
      scoreDirection || 'higher' // Default to 'higher' if not specified
    );

    return NextResponse.json({
      message: 'Jeu créé avec succès',
      gameId: result.lastInsertRowid,
      slug
    });
  } catch (error) {
    console.error('Create custom game error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}