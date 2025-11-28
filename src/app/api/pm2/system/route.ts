// app/api/system/route.ts
import { createRouteHandler } from '@/lib/routeHandler';
import * as localHandler from '@/lib/handlers/systemLocal';
import * as serverlessHandler from '@/lib/handlers/systemServerless';

// Pick the correct handlers based on your environment
const handlers = createRouteHandler(localHandler, serverlessHandler);

export const GET  = handlers.GET;
export const POST = handlers.POST;

