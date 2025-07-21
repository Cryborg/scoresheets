// Script pour ajouter la Belote à la base de données
import sqlite3 from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'scoresheets.db');
const db = sqlite3(dbPath);

try {
  // Vérifier si la Belote existe déjà
  const existingBelote = db.prepare('SELECT id FROM games WHERE slug = ?').get('belote');
  
  if (existingBelote) {
    console.log('✅ Belote déjà présente dans la base de données');
  } else {
    // Ajouter la Belote
    const result = db.prepare(`
      INSERT INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, score_direction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Belote',
      'belote', 
      1, // Jeux de cartes
      'Jeu de cartes français classique se jouant en équipes de 2 avec un jeu de 32 cartes. Objectif: être la première équipe à atteindre 501 points.',
      1, // is_implemented
      'rounds',
      1, // team_based
      4, // min_players
      4, // max_players
      'higher'
    );
    
    console.log('✅ Belote ajoutée avec succès, ID:', result.lastInsertRowid);
  }
  
  // Afficher tous les jeux
  const games = db.prepare('SELECT id, name, slug, is_implemented FROM games ORDER BY name').all();
  console.log('\n📋 Jeux disponibles:');
  games.forEach(game => {
    console.log(`  - ${game.name} (${game.slug}) - ${game.is_implemented ? '✅' : '❌'}`);
  });
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
} finally {
  db.close();
}