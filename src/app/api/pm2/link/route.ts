// app/api/pm2/link/route.ts

import { createRouteHandler } from '@/lib/routeHandler';
import { createProtectedRouteHandler } from '@/lib/withAuth';
import * as localHandler from '@/lib/handlers/linkLocal';
import * as serverlessHandler from '@/lib/handlers/linkServerless';

// Create smart route handler that selects based on environment and adds authentication
const handlers = createProtectedRouteHandler(
  localHandler,
  serverlessHandler,
  createRouteHandler
);
export const GET    = handlers.GET;
export const POST   = handlers.POST;
export const DELETE = handlers.DELETE;

