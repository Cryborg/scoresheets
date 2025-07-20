import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only handle API auth routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Let all other routes pass through - pages handle auth themselves
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};