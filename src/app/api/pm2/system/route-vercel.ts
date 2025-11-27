import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import { mockSystemInfo } from '@/lib/mockData';

// Check if running on Vercel or in demo mode
const isVercelOrDemo = process.env.VERCEL_ENV || process.env.DEMO_MODE === 'true';

export async function GET() {
  try {
    if (isVercelOrDemo) {
      // Return demo system information
      const systemInfo = {
        hostname: 'vercel-demo-server',
        platform: 'linux',
        arch: 'x64' as const,
        uptime: mockSystemInfo.uptime + Math.floor(Math.random() * 3600), // Add some variance
        totalmem: mockSystemInfo.totalmem,
        freemem: mockSystemInfo.freemem + (Math.random() * 1000000000),
        loadavg: mockSystemInfo.loadavg.map(load => Math.max(0, load + (Math.random() - 0.5) * 0.5)),
        cpu_count: mockSystemInfo.cpu_count,
        cpu_model: 'Intel(R) Xeon(R) CPU @ 2.20GHz (Demo)',
        node_version: process.version,
        pm2_version: '5.3.0 (Demo)',
        pm2_home: '/tmp/.pm2'
      };
      
      const processSummary = {
        total: 8,
        online: 6,
        stopped: 1,
        errored: 1,
        stopping: 0,
        launching: 0
      };
      
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
      
      const activeInterfaces = [
        {
          name: 'eth0',
          addresses: [
            {
              address: '10.0.0.1',
              netmask: '255.255.255.0',
              family: 'IPv4',
              mac: '02:42:ac:11:00:02',
              internal: false
            }
          ]
        }
      ];
      
      return NextResponse.json({
        success: true,
        data: {
          pm2: {
            status: 'online',
            version: '5.3.0 (Demo)',
            home: '/tmp/.pm2',
            process_summary: processSummary
          },
          system: systemInfo,
          memory: systemMemory,
          network: activeInterfaces,
          disk: {
            logs_size: '42.3M',
            logs_path: '/tmp/.pm2/logs'
          },
          timestamp: Date.now(),
          demoMode: true,
          message: 'This is demo data. Deploy to a server with PM2 for real system monitoring.'
        }
      });
    }
    
    // Fallback for non-Vercel environments (limited functionality)
    const memoryUsage = process.memoryUsage();
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpu_count: os.cpus().length,
      cpu_model: os.cpus()[0]?.model || 'Unknown',
      node_version: process.version,
      pm2_version: 'not installed',
      pm2_home: ''
    };
    
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
          status: 'offline',
          version: 'not installed',
          home: '',
          process_summary: {
            total: 0,
            online: 0,
            stopped: 0,
            errored: 0,
            stopping: 0,
            launching: 0
          }
        },
        system: systemInfo,
        memory: systemMemory,
        network: [],
        disk: null,
        timestamp: Date.now(),
        message: 'PM2 not available. Install PM2 for full functionality.'
      }
    });
  } catch (error: any) {
    console.error('System API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch system information',
        message: error.message,
        demoMode: isVercelOrDemo
      },
      { status: 500 }
    );
  }
}

// POST endpoint for system operations (demo mode)
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (isVercelOrDemo) {
      // Simulate system operations in demo mode
      const actions: { [key: string]: string } = {
        'kill': 'PM2 daemon killed (demo)',
        'resurrect': 'PM2 processes resurrected (demo)',
        'save': 'PM2 process list saved (demo)',
        'flush': 'PM2 logs flushed (demo)',
        'reload-logs': 'PM2 logs reloaded (demo)',
        'update': 'PM2 daemon updated (demo)'
      };
      
      const message = actions[action] || `Unknown system action: ${action} (demo)`;
      
      return NextResponse.json({
        success: true,
        message,
        output: `[DEMO] System operation '${action}' completed successfully`,
        error: '',
        demoMode: true
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'System operations not available',
        message: 'This environment does not support PM2 system operations.',
        demoMode: false
      },
      { status: 501 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute system command',
        message: error.message,
        demoMode: isVercelOrDemo
      },
      { status: 500 }
    );
  }
}