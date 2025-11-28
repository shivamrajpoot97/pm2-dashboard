import { NextRequest, NextResponse } from 'next/server';

// Environment detection
export const isVercelEnvironment = () => {
  return !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.VERCEL_URL ||
    process.env.NOW_REGION || // Legacy Vercel
    process.env.DEMO_MODE === 'true'
  );
};

export const isServerlessEnvironment = () => {
  return !!(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RENDER ||
    process.env.DEMO_MODE === 'true'
  );
};

// Dynamic route handler that selects the appropriate implementation
export function createRouteHandler(
  localHandler: {
    GET?:  (request: NextRequest) => Promise<NextResponse>;
    POST?: (request: NextRequest) => Promise<NextResponse>;
    PUT?:  (request: NextRequest) => Promise<NextResponse>;
    DELETE?:(request: NextRequest) => Promise<NextResponse>;
  },
  serverlessHandler: {
    GET?:  (request: NextRequest) => Promise<NextResponse>;
    POST?: (request: NextRequest) => Promise<NextResponse>;
    PUT?:  (request: NextRequest) => Promise<NextResponse>;
    DELETE?:(request: NextRequest) => Promise<NextResponse>;
  }
) {
  const isServerless = isServerlessEnvironment();
  console.log(`🌍 Environment detected: ${isServerless ? 'serverless' : 'local'}`);
  
  return {
    GET: async (request: NextRequest) => {
      const handler = isServerless ? serverlessHandler.GET : localHandler.GET;
      if (!handler) {
        return NextResponse.json(
          { success: false, error: 'GET method not supported' },
          { status: 405 }
        );
      }
      return await handler(request);
    },
    POST: async (request: NextRequest) => {
      const handler = isServerless ? serverlessHandler.POST : localHandler.POST;
      if (!handler) {
        return NextResponse.json(
          { success: false, error: 'POST method not supported' },
          { status: 405 }
        );
      }
      return await handler(request);
    },
    PUT: async (request: NextRequest) => {
      const handler = isServerless ? serverlessHandler.PUT : localHandler.PUT;
      if (!handler) {
        return NextResponse.json(
          { success: false, error: 'PUT method not supported' },
          { status: 405 }
        );
      }
      return await handler(request);
    },
    DELETE: async (request: NextRequest) => {
      const handler = isServerless ? serverlessHandler.DELETE : localHandler.DELETE;
      if (!handler) {
        return NextResponse.json(
          { success: false, error: 'DELETE method not supported' },
          { status: 405 }
        );
      }
      return await handler(request);
    }
  };
}

// Helper to add environment info to responses
export function addEnvironmentInfo(response: any) {
  return {
    ...response,
    environment: {
      isServerless: isServerlessEnvironment(),
      isVercel: isVercelEnvironment(),
      platform: process.env.VERCEL_ENV ? 'vercel' : 
                process.env.AWS_LAMBDA_FUNCTION_NAME ? 'aws-lambda' :
                process.env.NETLIFY ? 'netlify' :
                process.env.RAILWAY_ENVIRONMENT ? 'railway' :
                process.env.RENDER ? 'render' :
                'local',
      timestamp: Date.now()
    }
  };
}
