import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';

export async function POST() {
  try {
    console.log('🔑 Mise à jour des droits admin...');
    
    await initializeDatabase();
    
    // Update admin status for the specific user
    const result = await db.execute({
      sql: 'UPDATE users SET is_admin = ? WHERE email = ?',
      args: [1, 'cryborg.live@gmail.com']
    });

    if (result.rowsAffected === 0) {
      // User doesn't exist, let's create it
      console.log('👤 Utilisateur non trouvé, création...');
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('Célibataire1979$', 10);
      
      await db.execute({
        sql: `INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)`,
        args: ['Admin', 'cryborg.live@gmail.com', hashedPassword, 1]
      });

      console.log('✅ Utilisateur admin créé avec succès !');
      return NextResponse.json({ message: 'Utilisateur admin créé avec succès !' });
    }

    console.log('✅ Droits admin accordés avec succès !');

    // Verify
    const verification = await db.execute({
      sql: 'SELECT email, is_admin FROM users WHERE email = ?',
      args: ['cryborg.live@gmail.com']
    });
    
    const user = verification.rows[0];
    
    return NextResponse.json({ 
      message: 'Droits admin mis à jour avec succès !', 
      user: {
        email: user?.email,
        is_admin: Boolean(user?.is_admin)
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour admin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour admin', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}