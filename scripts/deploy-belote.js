const { createClient } = require('@libsql/client');

async function deployBelote() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('🎯 Vérification si Belote existe...');
    
    // Check if Belote already exists
    const existing = await client.execute({
      sql: 'SELECT id FROM games WHERE slug = ?',
      args: ['belote']
    });

    if (existing.rows.length > 0) {
      console.log('✅ Belote existe déjà en base');
      return;
    }

    console.log('🚀 Ajout de la Belote en production...');

    // Add Belote
    await client.execute({
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
    const verification = await client.execute('SELECT name, slug FROM games ORDER BY name');
    console.log('🎮 Jeux disponibles :');
    verification.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.slug})`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de Belote:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

deployBelote();