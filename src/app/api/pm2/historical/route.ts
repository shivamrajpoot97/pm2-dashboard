import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/routeHandler';
import { createProtectedRouteHandler } from '@/lib/withAuth';
import * as localHandler from '@/lib/handlers/historicalLocal';
import * as serverlessHandler from '@/lib/handlers/historicalServerless';

// Create smart route handler that selects based on environment and adds authentication
const handlers = createProtectedRouteHandler(localHandler, serverlessHandler, createRouteHandler);

export const GET = handlers.GET;
export const POST = handlers.POST;