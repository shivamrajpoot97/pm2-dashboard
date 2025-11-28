// app/api/pm2/route.ts
import { createRouteHandler } from '@/lib/routeHandler';
import { createProtectedRouteHandler } from '@/lib/withAuth';
import * as localHandler from '@/lib/handlers/pm2Local';
import * as serverlessHandler from '@/lib/handlers/pm2Serverless';

// Create smart route handler that selects based on environment and adds authentication
const handlers = createProtectedRouteHandler(
  localHandler,
  serverlessHandler,
  createRouteHandler
);
export const GET = handlers.GET;
export const POST = handlers.POST;

