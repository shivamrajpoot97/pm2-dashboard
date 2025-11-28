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
    hostname: 'serverless-demo-server',
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
    // Return demo data for serverless deployment
    const { processes, system } = getDemoData();
    
    return NextResponse.json({
      success: true,
      data: {
        processes,
        system,
        source: 'demo',
        serverName: 'Serverless Demo Server',
        timestamp: Date.now(),
        demoMode: true,
        message: 'This is demo data. Deploy to a server with PM2 for real monitoring.'
      }
    });
  } catch (error: any) {
    console.error('Serverless API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch PM2 data',
        message: error.message,
        demoMode: true
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, processId } = await request.json();
    
    // Simulate successful operations in demo mode
    return NextResponse.json({
      success: true,
      message: `Demo: ${action} would be executed on process ${processId}`,
      output: `[DEMO] Process ${processId} ${action} completed successfully`,
      error: '',
      demoMode: true
    });
  } catch (error: any) {
    console.error('Serverless PM2 Action Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute PM2 command',
        message: error.message,
        demoMode: true
      },
      { status: 500 }
    );
  }
}
