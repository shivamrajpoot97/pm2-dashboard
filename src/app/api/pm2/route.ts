// app/api/pm2/route.ts
import { createRouteHandler } from '@/lib/routeHandler'
import * as localHandler from '@/lib/handlers/pm2Local'
import * as serverlessHandler from '@/lib/handlers/pm2Serverless'

// decide at runtime which handler to use
const handlers = createRouteHandler(localHandler, serverlessHandler)

export const GET = handlers.GET
export const POST = handlers.POST

