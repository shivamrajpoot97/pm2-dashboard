import { NextRequest, NextResponse } from 'next/server';
import { 
  getCurrentHealthStatus,
  startHealthMonitoring,
  collectRealHealthMetrics,
  saveHealthMetrics
} from '@/lib/healthMonitor';

// Check if running on Vercel or in demo mode
const isVercelOrDemo = process.env.VERCEL_ENV || process.env.DEMO_MODE === 'true';

// Track if monitoring has been started
let monitoringStarted = false;

// GET: Get current health status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'start-monitoring' && !isVercelOrDemo) {
      if (!monitoringStarted) {
        console.log('Starting health monitoring...');
        await startHealthMonitoring(1); // Collect every 1 minute
        monitoringStarted = true;
        
        return NextResponse.json({
          success: true,
          message: 'Health monitoring started',
          interval: '1 minute',
          dataSource: 'real'
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'Health monitoring already running',
          dataSource: 'real'
        });
      }
    }
    
    // Get current health status
    if (isVercelOrDemo) {
      // Mock current status for demo
      return NextResponse.json({
        success: true,
        data: {
          timestamp: Date.now(),
          processes: [
            {
              processId: 0,
              name: 'demo-app',
              healthScore: 87.5,
              isHealthy: true,
              cpu: 23.1,
              memoryMB: 156.7,
              status: 'online',
              uptime: 8640,
              restarts: 1,
              healthIssues: []
            },
            {
              processId: 1, 
              name: 'api-server',
              healthScore: 92.3,
              isHealthy: true,
              cpu: 15.8,
              memoryMB: 98.4,
              status: 'online',
              uptime: 12480,
              restarts: 0,
              healthIssues: []
            }
          ],
          summary: {
            total: 2,
            healthy: 2,
            avgHealthScore: 89.9,
            criticalIssues: 0
          },
          dataSource: 'simulated'
        }
      });
    }
    
    const healthStatus = await getCurrentHealthStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        ...healthStatus,
        dataSource: 'real'
      }
    });
  } catch (error: any) {
    console.error('Health Status API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get health status',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// POST: Manually collect health metrics
export async function POST(request: NextRequest) {
  try {
    if (isVercelOrDemo) {
      return NextResponse.json({
        success: true,
        message: 'Demo: Health metrics collected',
        dataSource: 'simulated'
      });
    }
    
    console.log('Manually collecting health metrics...');
    const metrics = await collectRealHealthMetrics();
    
    if (metrics.length > 0) {
      await saveHealthMetrics(metrics);
      
      return NextResponse.json({
        success: true,
        message: `Health metrics collected for ${metrics.length} processes`,
        data: {
          processCount: metrics.length,
          healthyProcesses: metrics.filter(m => m.isHealthy).length,
          avgHealthScore: metrics.reduce((sum, m) => sum + m.healthScore, 0) / metrics.length,
          timestamp: Date.now()
        },
        dataSource: 'real'
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'No PM2 processes found',
        data: { processCount: 0 },
        dataSource: 'real'
      });
    }
  } catch (error: any) {
    console.error('Health Collection API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to collect health metrics',
        message: error.message
      },
      { status: 500 }
    );
  }
}