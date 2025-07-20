import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
    cookieStore.delete('auth-check');

    return NextResponse.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}