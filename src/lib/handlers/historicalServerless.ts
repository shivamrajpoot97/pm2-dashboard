import { NextRequest, NextResponse } from 'next/server';

// Serverless/demo version with mock data that simulates real historical patterns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';
    const processId = searchParams.get('processId');
    
    // Calculate time range and intervals
    const now = Date.now();
    let startTime: number;
    let intervals: number;
    let step: number;
    
    switch (period) {
      case '1h':
        startTime = now - (60 * 60 * 1000);
        intervals = 60; // 1 point per minute
        step = 60 * 1000;
        break;
      case '24h':
        startTime = now - (24 * 60 * 60 * 1000);
        intervals = 144; // 1 point per 10 minutes
        step = 10 * 60 * 1000;
        break;
      case '1w':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        intervals = 168; // 1 point per hour
        step = 60 * 60 * 1000;
        break;
      case '1m':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        intervals = 720; // 1 point per hour
        step = 60 * 60 * 1000;
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
        intervals = 144;
        step = 10 * 60 * 1000;
    }
    
    // Generate realistic time series data
    const generateRealisticTimeSeries = (baseValue: number, variance: number, trend = 0) => {
      return Array.from({ length: intervals }, (_, i) => {
        const timestamp = startTime + (i * step);
        const trendValue = baseValue + (trend * i / intervals);
        const noise = (Math.random() - 0.5) * variance;
        const dailyCycle = Math.sin((timestamp / (24 * 60 * 60 * 1000)) * 2 * Math.PI) * (variance * 0.3);
        const hourlyCycle = Math.sin((timestamp / (60 * 60 * 1000)) * 2 * Math.PI) * (variance * 0.1);
        
        return {
          timestamp,
          value: Math.max(0, trendValue + noise + dailyCycle + hourlyCycle)
        };
      });
    };
    
    if (processId) {
      // Generate app-specific historical data
      const appData = {
        period,
        processId: parseInt(processId),
        dataPoints: Array.from({ length: intervals }, (_, i) => {
          const timestamp = startTime + (i * step);
          return {
            timestamp,
            process: {
              pm_id: parseInt(processId),
              name: `app-${processId}`,
              cpu: Math.max(0, 15 + Math.sin(timestamp / 1000000) * 10 + (Math.random() - 0.5) * 8),
              memory: Math.max(50, 180 + Math.sin(timestamp / 2000000) * 60 + (Math.random() - 0.5) * 40) * 1024 * 1024,
              status: 'online',
              restarts: Math.floor(Math.random() * 3),
              metrics: {
                heap: Math.max(20, 128 + Math.sin(timestamp / 1500000) * 40 + (Math.random() - 0.5) * 30),
                eventLoopDelay: Math.max(0.1, 2.5 + Math.sin(timestamp / 800000) * 1.5 + (Math.random() - 0.5) * 1),
                httpRequests: Math.max(0, 150 + Math.sin(timestamp / 600000) * 100 + (Math.random() - 0.5) * 50),
                httpLatency: Math.max(10, 85 + Math.sin(timestamp / 900000) * 30 + (Math.random() - 0.5) * 25),
                errors: Math.max(0, Math.random() * 3)
              }
            }
          };
        }),
        summary: {
          totalPoints: intervals,
          timeRange: { start: startTime, end: now },
          avgCpu: 15.2,
          avgMemory: 185,
          totalRequests: 45680,
          errorRate: 0.12
        }
      };
      
      return NextResponse.json({
        success: true,
        data: appData,
        demoMode: true,
        message: 'This is simulated historical data. Deploy to a server with PM2 for real historical tracking.'
      });
    }
    
    // Generate system-wide historical data
    const systemData = {
      period,
      dataPoints: Array.from({ length: intervals }, (_, i) => {
        const timestamp = startTime + (i * step);
        return {
          timestamp,
          system: {
            cpu: {
              usage: Math.max(0, 25 + Math.sin(timestamp / 2000000) * 15 + (Math.random() - 0.5) * 10),
              loadAvg: Math.max(0, 1.2 + Math.sin(timestamp / 1800000) * 0.8 + (Math.random() - 0.5) * 0.4),
              cores: 8
            },
            memory: {
              total: 16 * 1024 * 1024 * 1024,
              usagePercent: Math.max(10, 60 + Math.sin(timestamp / 2500000) * 20 + (Math.random() - 0.5) * 15),
              free: 6 * 1024 * 1024 * 1024,
              used: 10 * 1024 * 1024 * 1024
            },
            disk: {
              reads: Math.max(0, 1200 + Math.sin(timestamp / 1200000) * 800 + (Math.random() - 0.5) * 400),
              writes: Math.max(0, 800 + Math.sin(timestamp / 1000000) * 400 + (Math.random() - 0.5) * 300)
            },
            network: {
              rx: Math.max(0, 50 + Math.sin(timestamp / 900000) * 30 + (Math.random() - 0.5) * 20),
              tx: Math.max(0, 35 + Math.sin(timestamp / 1100000) * 20 + (Math.random() - 0.5) * 15)
            },
            processes: {
              total: Math.floor(150 + Math.sin(timestamp / 3000000) * 20 + (Math.random() - 0.5) * 10),
              online: Math.floor(23 + Math.sin(timestamp / 2000000) * 8 + (Math.random() - 0.5) * 5)
            }
          }
        };
      }),
      summary: {
        totalPoints: intervals,
        timeRange: { start: startTime, end: now },
        latestMetrics: {
          cpu: { usage: 25.3, loadAvg: 1.2 },
          memory: { usagePercent: 62.1 },
          processes: { total: 156, online: 23 }
        }
      }
    };
    
    return NextResponse.json({
      success: true,
      data: systemData,
      demoMode: true,
      message: 'This is simulated historical data with realistic patterns. Deploy to a server with PM2 for real historical tracking.'
    });
    
  } catch (error: any) {
    console.error('Historical serverless data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate historical data',
        message: error.message
      },
      { status: 500 }
    );
  }
}