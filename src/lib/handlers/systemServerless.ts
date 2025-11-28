import { NextRequest, NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  try {
    // Mock PM2 daemon status for serverless
    const pm2Status = 'demo';
    const pm2Version = '5.3.0 (demo)';
    const pm2Home = '/tmp/.pm2';
    
    // Get system information
    const systemInfo = {
      hostname: 'serverless-demo',
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpu_count: os.cpus().length,
      cpu_model: os.cpus()[0]?.model || 'Unknown',
      node_version: process.version,
      pm2_version: pm2Version,
      pm2_home: pm2Home
    };
    
    // Mock process summary for demo
    const processSummary = {
      total: 5,
      online: 4,
      stopped: 1,
      errored: 0,
      stopping: 0,
      launching: 0
    };
    
    // Mock disk usage
    const diskUsage = {
      logs_size: '2.4M',
      logs_path: '/tmp/.pm2/logs'
    };
    
    // Get network information (real)
    const networkInterfaces = os.networkInterfaces();
    const activeInterfaces = Object.keys(networkInterfaces)
      .filter(name => name !== 'lo' && networkInterfaces[name])
      .map(name => ({
        name,
        addresses: networkInterfaces[name]?.filter(addr => !addr.internal) || []
      }))
      .filter(iface => iface.addresses.length > 0);
    
    // Memory usage breakdown (real)
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: systemInfo.totalmem,
      free: systemInfo.freemem,
      used: systemInfo.totalmem - systemInfo.freemem,
      usage_percent: ((systemInfo.totalmem - systemInfo.freemem) / systemInfo.totalmem) * 100,
      node_process: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      }
    };
    
    return NextResponse.json({
      success: true,
      data: {
        pm2: {
          status: pm2Status,
          version: pm2Version,
          home: pm2Home,
          process_summary: processSummary
        },
        system: systemInfo,
        memory: systemMemory,
        network: activeInterfaces,
        disk: diskUsage,
        timestamp: Date.now(),
        demoMode: true
      }
    });
  } catch (error: any) {
    console.error('Serverless System API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch system information',
        message: error.message,
        demoMode: true
      },
      { status: 500 }
    );
  }
}

// POST endpoint for system operations (demo mode)
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    let message = '';
    
    switch (action) {
      case 'kill':
        message = 'Demo: PM2 daemon would be killed';
        break;
      case 'resurrect':
        message = 'Demo: PM2 processes would be resurrected';
        break;
      case 'save':
        message = 'Demo: PM2 process list would be saved';
        break;
      case 'flush':
        message = 'Demo: PM2 logs would be flushed';
        break;
      case 'reload-logs':
        message = 'Demo: PM2 logs would be reloaded';
        break;
      case 'update':
        message = 'Demo: PM2 daemon would be updated';
        break;
      default:
        throw new Error(`Unknown system action: ${action}`);
    }
    
    return NextResponse.json({
      success: true,
      message,
      output: `[DEMO] System action '${action}' completed successfully`,
      error: '',
      demoMode: true
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute system command',
        message: error.message,
        demoMode: true
      },
      { status: 500 }
    );
  }
}
