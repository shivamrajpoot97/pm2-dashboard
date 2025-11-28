import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/routeHandler';
import { createProtectedRouteHandler } from '@/lib/withAuth';
import * as localHandler from '@/lib/handlers/systemLocal';
import * as serverlessHandler from '@/lib/handlers/systemServerless';

// Create smart route handler that selects based on environment and adds authentication
const handlers = createProtectedRouteHandler(localHandler, serverlessHandler, createRouteHandler);

export const GET = handlers.GET;
export const POST = handlers.POST;
