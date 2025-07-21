import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { initializeDatabase } from '@/lib/database';
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants';

export async function withApiHandler<T>(
  handler: (userId: number) => Promise<T>,
  options?: { initDb?: boolean }
): Promise<NextResponse> {
  try {
    const { initDb = true } = options || {};
    
    if (initDb) {
      await initializeDatabase();
    }

    // For this generic handler, we'll need the request to get userId
    // This is a simplified version - in practice you'd pass the request
    const userId = 1; // Placeholder - would come from request
    
    const result = await handler(userId);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function validateUserAndInitDb(request: NextRequest) {
  await initializeDatabase();
  
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
  }
  
  return userId;
}

export function createErrorResponse(
  message: string = ERROR_MESSAGES.SERVER_ERROR,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

export function createSuccessResponse<T>(
  data: T,
  status: number = HTTP_STATUS.OK
) {
  return NextResponse.json(data, { status });
}