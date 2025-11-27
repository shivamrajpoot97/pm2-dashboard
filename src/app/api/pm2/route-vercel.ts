import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import { mockProcesses, mockSystemInfo } from '@/lib/mockData';

interface PM2Process {
  pid: number;
  name: string;
  pm_id: number;
  status: string;
  restart_time: number;
  created_at: number;
  pm2_env: any;
  monit: {
    memory: number;
    cpu: number;
  };
}

interface SystemInfo {
  hostname: string;
  uptime: number;
  totalmem: number;
  freemem: number;
  loadavg: number[];
  cpu_count: number;
}

// Check if running on Vercel or in demo mode
const isVercelOrDemo = process.env.VERCEL_ENV || process.env.DEMO_MODE === 'true';

// Get demo data that simulates real PM2 processes
function getDemoData() {
  const processes: PM2Process[] = mockProcesses.map((proc, index) => ({
    pid: proc.pid,
    name: proc.name,
    pm_id: index,
    status: proc.status,
    restart_time: proc.restart_time || 0,
    created_at: proc.pm2_env?.created_at || Date.now() - (Math.random() * 86400000), // Random time in last 24h
    pm2_env: {
      status: proc.status,
      instances: 1,
      pm_exec_path: proc.pm2_env?.pm_exec_path || `/app/${proc.name}.js`,
      pm_cwd: proc.pm2_env?.pm_cwd || '/app',
      exec_interpreter: 'node',
      pm_out_log_path: `/app/logs/${proc.name}-out.log`,
      pm_err_log_path: `/app/logs/${proc.name}-error.log`,
      pm_pid_path: `/app/pids/${proc.name}.pid`,
      username: 'vercel',
      merge_logs: false,
      vizion_running: false,
      created_at: proc.pm2_env?.created_at || Date.now() - (Math.random() * 86400000),
      pm_uptime: Date.now() - (proc.pm2_env?.created_at || Date.now() - (Math.random() * 86400000)),
      unstable_restarts: proc.restart_time || 0,
      restart_time: proc.restart_time || 0,
      axm_actions: [],
      axm_monitor: {},
      axm_options: {},
      axm_dynamic: {},
      vizion: false,
      node_version: process.version,
    },
    monit: {
      memory: proc.monit.memory + (Math.random() * 10000000), // Add some variance
      cpu: Math.max(0, proc.monit.cpu + (Math.random() - 0.5) * 10) // Add some variance
    }
  }));

  const system: SystemInfo = {
    hostname: isVercelOrDemo ? 'vercel-demo-server' : os.hostname(),
    uptime: mockSystemInfo.uptime + Math.floor(Math.random() * 3600), // Add some variance
    totalmem: mockSystemInfo.totalmem,
    freemem: mockSystemInfo.freemem + (Math.random() * 1000000000), // Simulate changing free memory
    loadavg: mockSystemInfo.loadavg.map(load => Math.max(0, load + (Math.random() - 0.5) * 0.5)),
    cpu_count: mockSystemInfo.cpu_count
  };

  return { processes, system };
}

export async function GET() {
  try {
    if (isVercelOrDemo) {
      // Return demo data for Vercel deployment
      const { processes, system } = getDemoData();
      
      return NextResponse.json({
        success: true,
        data: {
          processes,
          system,
          source: 'demo',
          serverName: 'Vercel Demo Server',
          timestamp: Date.now(),
          demoMode: true,
          message: 'This is demo data. Deploy to a server with PM2 for real monitoring.'
        }
      });
    }

    // If not on Vercel, try to fallback to local system info
    return NextResponse.json({
      success: true,
      data: {
        processes: [],
        system: {
          hostname: os.hostname(),
          uptime: os.uptime(),
          totalmem: os.totalmem(),
          freemem: os.freemem(),
          loadavg: os.loadavg(),
          cpu_count: os.cpus().length
        },
        source: 'local',
        timestamp: Date.now(),
        message: 'PM2 not available. Install PM2 and start some processes to see real data.'
      }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch PM2 data',
        message: error.message,
        demoMode: isVercelOrDemo
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, processId } = await request.json();
    
    if (isVercelOrDemo) {
      // Simulate successful operations in demo mode
      return NextResponse.json({
        success: true,
        message: `Demo: ${action} would be executed on process ${processId}`,
        output: `[DEMO] Process ${processId} ${action} completed successfully`,
        error: '',
        demoMode: true
      });
    }

    // If not in demo mode, return error since PM2 operations aren't available
    return NextResponse.json(
      { 
        success: false, 
        error: 'PM2 operations not available',
        message: 'This environment does not support PM2 operations. Use demo mode or deploy to a server with PM2.',
        demoMode: false
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('PM2 Action Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute PM2 command',
        message: error.message,
        demoMode: isVercelOrDemo
      },
      { status: 500 }
    );
  }
}