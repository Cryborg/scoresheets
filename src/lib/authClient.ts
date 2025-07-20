/**
 * Client-side authentication utilities
 */

/**
 * Checks if user is authenticated by validating the token
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for auth-check cookie (non-httpOnly)
    console.log('Checking auth, cookies:', document.cookie);
    const authCheck = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-check='))
      ?.split('=')[1];
    
    console.log('Auth check cookie value:', authCheck);
    return authCheck === '1';
  } catch {
    return false;
  }
}

/**
 * Redirects to login page
 */
export function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
}

/**
 * Global fetch wrapper that handles authentication errors
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include'
  });
  
  if (response.status === 401) {
    // Let AuthGuard handle the redirect
    throw new Error('Non autorisé');
  }
  
  return response;
}