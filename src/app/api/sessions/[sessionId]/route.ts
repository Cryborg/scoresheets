import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';

function getUserIdFromRequest(request: NextRequest): number | null {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { sessionId: sessionIdParam } = await params;
  const sessionId = parseInt(sessionIdParam);
  if (isNaN(sessionId)) {
    return NextResponse.json({ error: 'ID de session invalide' }, { status: 400 });
  }

  try {
    await initializeDatabase();
    
    // Verify the session belongs to the user
    const session = await db.prepare(
      'SELECT user_id FROM game_sessions WHERE id = ?'
    ).get(sessionId) as { user_id: number } | undefined;

    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    if (session.user_id !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Delete related data sequentially (async doesn't support transactions the same way)
    const deleteScores = await db.prepare('DELETE FROM scores WHERE session_id = ?');
    const deletePlayers = await db.prepare('DELETE FROM players WHERE session_id = ?');
    const deleteSession = await db.prepare('DELETE FROM game_sessions WHERE id = ?');

    await deleteScores.run(sessionId);
    await deletePlayers.run(sessionId);
    await deleteSession.run(sessionId);

    return NextResponse.json({ message: 'Session supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}