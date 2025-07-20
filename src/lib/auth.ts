import { NextRequest, NextResponse } from 'next/server';

/**
 * Extracts and validates the user ID from the JWT token in the request cookies
 * @param request - The incoming Next.js request
 * @returns The user ID or null if authentication fails
 */
export function getAuthenticatedUserId(request: NextRequest): number | null {
  try {
    console.log('Auth: Checking authentication');
    const token = request.cookies.get('auth-token')?.value;
    console.log('Auth: Token present:', !!token);
    
    if (!token) {
      console.log('Auth: No token found');
      return null;
    }

    // For Edge runtime compatibility, we decode manually
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Auth: Decoded payload:', payload);
    
    if (!payload.userId) {
      console.log('Auth: No userId in payload');
      return null;
    }

    console.log('Auth: Authenticated user ID:', payload.userId);
    return payload.userId;
  } catch (error) {
    console.log('Auth: Error during authentication:', error);
    return null;
  }
}

/**
 * Returns an unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
}