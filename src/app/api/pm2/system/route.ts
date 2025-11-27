import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get PM2 daemon status
    let pm2Status = 'unknown';
    let pm2Version = 'unknown';
    let pm2Home = process.env.PM2_HOME || '';
    
    try {
      const { stdout: statusOutput } = await execAsync('pm2 ping');
      pm2Status = statusOutput.includes('pong') ? 'online' : 'offline';
    } catch (error) {
      pm2Status = 'offline';
    }
    
    try {
      const { stdout: versionOutput } = await execAsync('pm2 --version');
      pm2Version = versionOutput.trim();
    } catch (error) {
      // PM2 not installed or not in PATH
    }
    
    // Get system information
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
      pm2_version: pm2Version,
      pm2_home: pm2Home
    };
    
    // Get process count and status summary
    let processSummary = {
      total: 0,
      online: 0,
      stopped: 0,
      errored: 0,
      stopping: 0,
      launching: 0
    };
    
    try {
      const { stdout } = await execAsync('pm2 jlist');
      if (stdout.trim()) {
        const processes = JSON.parse(stdout);
        processSummary.total = processes.length;
        
        processes.forEach((proc: any) => {
          const status = proc.pm2_env?.status || 'unknown';
          switch (status) {
            case 'online':
              processSummary.online++;
              break;
            case 'stopped':
              processSummary.stopped++;
              break;
            case 'errored':
              processSummary.errored++;
              break;
            case 'stopping':
              processSummary.stopping++;
              break;
            case 'launching':
              processSummary.launching++;
              break;
          }
        });
      }
    } catch (error) {
      console.warn('Could not fetch process summary:', error);
    }
    
    // Get disk usage for PM2 logs directory
    let diskUsage = null;
    try {
      const pm2LogsPath = pm2Home ? `${pm2Home}/logs` : os.homedir() + '/.pm2/logs';
      const { stdout: duOutput } = await execAsync(`du -sh "${pm2LogsPath}" 2>/dev/null || echo "0K"`);
      diskUsage = {
        logs_size: duOutput.split('\t')[0] || '0K',
        logs_path: pm2LogsPath
      };
    } catch (error) {
      // Disk usage not available
    }
    
    // Get network information
    const networkInterfaces = os.networkInterfaces();
    const activeInterfaces = Object.keys(networkInterfaces)
      .filter(name => name !== 'lo' && networkInterfaces[name])
      .map(name => ({
        name,
        addresses: networkInterfaces[name]?.filter(addr => !addr.internal) || []
      }))
      .filter(iface => iface.addresses.length > 0);
    
    // Memory usage breakdown
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
        timestamp: Date.now()
      }
    });
  } catch (error: any) {
    console.error('System API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch system information',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// POST endpoint for system operations
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    let command = '';
    let message = '';
    
    switch (action) {
      case 'kill':
        command = 'pm2 kill';
        message = 'PM2 daemon killed';
        break;
      case 'resurrect':
        command = 'pm2 resurrect';
        message = 'PM2 processes resurrected';
        break;
      case 'save':
        command = 'pm2 save';
        message = 'PM2 process list saved';
        break;
      case 'flush':
        command = 'pm2 flush';
        message = 'PM2 logs flushed';
        break;
      case 'reload-logs':
        command = 'pm2 reloadLogs';
        message = 'PM2 logs reloaded';
        break;
      case 'update':
        command = 'pm2 update';
        message = 'PM2 daemon updated';
        break;
      default:
        throw new Error(`Unknown system action: ${action}`);
    }
    
    const { stdout, stderr } = await execAsync(command);
    
    return NextResponse.json({
      success: true,
      message,
      output: stdout,
      error: stderr
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute system command',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
