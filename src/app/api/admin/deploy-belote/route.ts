import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';

export async function POST() {
  try {
    console.log('🎯 Vérification si Belote existe...');
    
    await initializeDatabase();
    
    // Check if Belote already exists
    const existing = await db.execute({
      sql: 'SELECT id FROM games WHERE slug = ?',
      args: ['belote']
    });

    if (existing.rows.length > 0) {
      console.log('✅ Belote existe déjà en base');
      return NextResponse.json({ message: 'Belote existe déjà en base' });
    }

    console.log('🚀 Ajout de la Belote en production...');

    // Add Belote
    await db.execute({
      sql: `INSERT INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, score_direction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'Belote',
        'belote',
        1, // Jeux de cartes (category_id = 1)
        'Jeu de cartes français classique se jouant en équipes de 2 avec un jeu de 32 cartes. Objectif: être la première équipe à atteindre 501 points.',
        1, // is_implemented = true
        'rounds',
        1, // team_based = true 
        4, // min_players = 4
        4, // max_players = 4
        'higher'
      ]
    });

    console.log('✅ Belote ajoutée avec succès en production !');

    // Verify
    const verification = await db.execute('SELECT name, slug FROM games ORDER BY name');
    const games = verification.rows.map(row => ({ name: row.name, slug: row.slug }));
    
    return NextResponse.json({ 
      message: 'Belote ajoutée avec succès !', 
      games 
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de Belote:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de Belote', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}