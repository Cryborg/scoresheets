import { NextRequest, NextResponse } from 'next/server';
import { addNewGame } from '@/lib/game-migrations';

export async function POST(request: NextRequest) {
  try {
    const gameData = await request.json();
    
    // Validate required fields
    if (!gameData.name || !gameData.slug) {
      return NextResponse.json({ error: 'Nom et slug requis' }, { status: 400 });
    }

    // Add the game using the migration system
    await addNewGame({
      name: gameData.name,
      slug: gameData.slug,
      category_id: gameData.category_id || 1,
      rules: gameData.rules || '',
      is_implemented: gameData.is_implemented || false,
      score_type: gameData.score_type || 'rounds',
      team_based: gameData.team_based || false,
      min_players: gameData.min_players || 2,
      max_players: gameData.max_players || 6,
      score_direction: gameData.score_direction || 'higher'
    });

    return NextResponse.json({ success: true, message: 'Jeu ajouté avec succès' });
  } catch (error) {
    console.error('Error adding game:', error);
    
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Un jeu avec ce nom ou slug existe déjà' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}