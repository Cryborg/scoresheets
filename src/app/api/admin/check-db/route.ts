import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 Vérification de la structure de la base...');
    
    await initializeDatabase();
    
    // Check users table structure
    const usersStructure = await db.execute(`PRAGMA table_info(users)`);
    console.log('👤 Structure table users:', usersStructure.rows);

    // Check games table structure  
    const gamesStructure = await db.execute(`PRAGMA table_info(games)`);
    console.log('🎮 Structure table games:', gamesStructure.rows);

    // Check existing users
    const users = await db.execute('SELECT id, username, email, is_admin FROM users LIMIT 5');
    console.log('👥 Utilisateurs existants:', users.rows);

    // Check existing games
    const games = await db.execute('SELECT id, name, slug, is_implemented FROM games');
    console.log('🎲 Jeux existants:', games.rows);

    return NextResponse.json({
      message: 'Vérification terminée',
      tables: {
        users: {
          structure: usersStructure.rows,
          data: users.rows
        },
        games: {
          structure: gamesStructure.rows,
          data: games.rows
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la vérification', 
        details: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    console.log('🔧 Correction de la structure de la base...');
    
    await initializeDatabase();

    // Add missing columns to users table if they don't exist
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE`);
      console.log('✅ Colonne is_admin ajoutée à la table users');
    } catch (error) {
      console.log('ℹ️ Colonne is_admin existe déjà ou erreur:', error);
    }

    try {
      await db.execute(`ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ Colonne created_at ajoutée à la table users');
    } catch (error) {
      console.log('ℹ️ Colonne created_at existe déjà ou erreur:', error);
    }

    try {
      await db.execute(`ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ Colonne updated_at ajoutée à la table users');
    } catch (error) {
      console.log('ℹ️ Colonne updated_at existe déjà ou erreur:', error);
    }

    // Update admin user
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (adminEmail && adminPassword) {
      const result = await db.execute({
        sql: 'UPDATE users SET is_admin = ? WHERE email = ?',
        args: [1, adminEmail]
      });

      if (result.rowsAffected === 0) {
        // Create admin user if doesn't exist
        const bcrypt = await import('bcrypt');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        await db.execute({
          sql: `INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)`,
          args: ['Admin', adminEmail, hashedPassword, 1]
        });
        console.log('✅ Utilisateur admin créé');
      } else {
        console.log('✅ Droits admin accordés à l\'utilisateur existant');
      }
    }

    // Verify final structure
    const finalCheck = await db.execute('SELECT id, username, email, is_admin FROM users WHERE email = ?', [adminEmail || 'admin']);
    
    return NextResponse.json({
      message: 'Structure corrigée avec succès',
      adminUser: finalCheck.rows[0] || null
    });

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la correction', 
        details: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
}