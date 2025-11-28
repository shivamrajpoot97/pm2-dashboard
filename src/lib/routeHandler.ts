import { NextRequest, NextResponse } from 'next/server'

// Environment detection
export const isVercelEnvironment = (): boolean => {
  return !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.VERCEL_URL ||
    process.env.NOW_REGION ||    // Legacy Vercel
    process.env.DEMO_MODE === 'true'
  )
}
export const isServerlessEnvironment = (): boolean => {
  return !!(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RENDER ||
    process.env.DEMO_MODE === 'true'
  )
}

// Dynamic route handler that selects the appropriate implementation
export function createRouteHandler(
  localHandler: Record<string, any>,
  serverlessHandler: Record<string, any>
) {
  const isServerless = isServerlessEnvironment()
  console.log(`🌍 Environment detected: ${isServerless ? 'serverless' : 'local'}`)
  
  const handlers: Record<string, any> = {}

  if (localHandler.GET || serverlessHandler.GET) {
    handlers.GET = async (request: NextRequest) => {
      const handler = isServerless ? serverlessHandler.GET : localHandler.GET
      return await handler(request)
    }
  }

  if (localHandler.POST || serverlessHandler.POST) {
    handlers.POST = async (request: NextRequest) => {
      const handler = isServerless ? serverlessHandler.POST : localHandler.POST
      return await handler(request)
    }
  }

  if (localHandler.PUT || serverlessHandler.PUT) {
    handlers.PUT = async (request: NextRequest) => {
      const handler = isServerless ? serverlessHandler.PUT : localHandler.PUT
      return await handler(request)
    }
  }

  if (localHandler.DELETE || serverlessHandler.DELETE) {
    handlers.DELETE = async (request: NextRequest) => {
      const handler = isServerless
        ? serverlessHandler.DELETE
        : localHandler.DELETE
      return await handler(request)
    }
  }

  return handlers
}
