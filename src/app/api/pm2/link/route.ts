// app/api/pm2/link/route.ts

import { createRouteHandler } from '@/lib/routeHandler'
import * as localHandler from '@/lib/handlers/linkLocal'
import * as serverlessHandler from '@/lib/handlers/linkServerless'

// createRouteHandler will inspect the environment and
// choose either the localHandler or the serverlessHandler
const handlers = createRouteHandler(localHandler, serverlessHandler)

export const GET    = handlers.GET
export const POST   = handlers.POST
export const DELETE = handlers.DELETE
