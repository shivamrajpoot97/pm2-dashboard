import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check PM2 availability
    let pm2Available = false;
    let pm2Error = null;
    
    try {
      await execAsync('pm2 ping');
      pm2Available = true;
    } catch (error: any) {
      pm2Error = error.message;
    }
    
    // System health metrics
    const memoryUsage = process.memoryUsage();
    const systemLoad = os.loadavg();
    const freeMemPercent = (os.freemem() / os.totalmem()) * 100;
    
    // Dashboard process metrics
    const dashboardHealth = {
      uptime: process.uptime(),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        heapUsedPercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpu: {
        loadAverage: systemLoad,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length
      }
    };
    
    // Determine overall health status
    let status = 'healthy';
    const issues = [];
    
    if (!pm2Available) {
      status = 'warning';
      issues.push('PM2 daemon not available');
    }
    
    if (freeMemPercent < 10) {
      status = 'warning';
      issues.push('Low system memory');
    }
    
    if (systemLoad[0] > os.cpus().length * 2) {
      status = 'warning';
      issues.push('High system load');
    }
    
    if (dashboardHealth.memory.heapUsedPercent > 90) {
      status = 'warning';
      issues.push('High dashboard memory usage');
    }
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      responseTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      pm2: {
        available: pm2Available,
        error: pm2Error
      },
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: os.uptime(),
        loadAverage: systemLoad,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          freePercent: freeMemPercent
        }
      },
      dashboard: dashboardHealth,
      issues
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message
      },
      { status: 500 }
    );
  }
}
