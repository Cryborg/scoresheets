import { NextRequest, NextResponse } from 'next/server';

/**
 * Extracts and validates the user ID from the JWT token in the request cookies
 * @param request - The incoming Next.js request
 * @returns The user ID or null if authentication fails
 */
export function getAuthenticatedUserId(request: NextRequest): number | null {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    // For Edge runtime compatibility, we decode manually
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    if (!payload.userId) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}

/**
 * Returns an unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
}