import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAuthResponse } from './auth';

// Higher-order function to wrap route handlers with authentication
export function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    const { authenticated, user } = requireAuth(request);
    
    if (!authenticated) {
      return createAuthResponse('Authentication required. Please login first.');
    }
    
    // Add user info to the request for use in handlers
    (request as any).user = user;
    
    return handler(request, context);
  };
}

// Wrapper for route handlers that need authentication
export function createProtectedRouteHandler(
  localHandler: any,
  serverlessHandler: any,
  createRouteHandler: any
) {
  const handlers = createRouteHandler(localHandler, serverlessHandler);
  
  return {
    GET: handlers.GET ? withAuth(handlers.GET) : undefined,
    POST: handlers.POST ? withAuth(handlers.POST) : undefined,
    PUT: handlers.PUT ? withAuth(handlers.PUT) : undefined,
    DELETE: handlers.DELETE ? withAuth(handlers.DELETE) : undefined
  };
}
