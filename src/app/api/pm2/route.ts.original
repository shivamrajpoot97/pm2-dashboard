import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

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

interface LinkedServer {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  isActive: boolean;
  lastSeen: number;
  pm2Data?: any[];
  systemInfo?: any;
}

// Get linked servers data
async function getLinkedServers(): Promise<LinkedServer[]> {
  try {
    const linksFile = path.join(process.cwd(), '.pm2-links', 'servers.json');
    if (!existsSync(linksFile)) {
      return [];
    }
    const data = await readFile(linksFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Get the best available PM2 data (local or from linked servers)
async function getBestPM2Data(): Promise<{ processes: PM2Process[], system: SystemInfo, source: 'local' | 'linked', serverName?: string }> {
  try {
    // Try to get local PM2 data first
    const { stdout } = await execAsync('pm2 jlist');
    let processes: PM2Process[] = [];
    
    if (stdout.trim()) {
      const pm2Processes = JSON.parse(stdout);
      processes = pm2Processes.map((proc: any) => ({
        pid: proc.pid || 0,
        name: proc.name,
        pm_id: proc.pm_id,
        status: proc.pm2_env?.status || 'unknown',
        restart_time: proc.pm2_env?.restart_time || 0,
        created_at: proc.pm2_env?.created_at || Date.now(),
        pm2_env: {
          status: proc.pm2_env?.status || 'unknown',
          instances: proc.pm2_env?.instances || 1,
          pm_exec_path: proc.pm2_env?.pm_exec_path || '',
          pm_cwd: proc.pm2_env?.pm_cwd || '',
          exec_interpreter: proc.pm2_env?.exec_interpreter || 'node',
          pm_out_log_path: proc.pm2_env?.pm_out_log_path || '',
          pm_err_log_path: proc.pm2_env?.pm_err_log_path || '',
          pm_pid_path: proc.pm2_env?.pm_pid_path || '',
          username: proc.pm2_env?.username || 'unknown',
          merge_logs: proc.pm2_env?.merge_logs || false,
          vizion_running: proc.pm2_env?.vizion_running || false,
          created_at: proc.pm2_env?.created_at || Date.now(),
          pm_uptime: proc.pm2_env?.pm_uptime || Date.now(),
          unstable_restarts: proc.pm2_env?.unstable_restarts || 0,
          restart_time: proc.pm2_env?.restart_time || 0,
          axm_actions: proc.pm2_env?.axm_actions || [],
          axm_monitor: proc.pm2_env?.axm_monitor || {},
          axm_options: proc.pm2_env?.axm_options || {},
          axm_dynamic: proc.pm2_env?.axm_dynamic || {},
          vizion: proc.pm2_env?.vizion || false,
          node_version: proc.pm2_env?.node_version || process.version,
          ...proc.pm2_env
        },
        monit: {
          memory: proc.monit?.memory || 0,
          cpu: proc.monit?.cpu || 0
        }
      }));
    }

    const system: SystemInfo = {
      hostname: os.hostname(),
      uptime: os.uptime(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpu_count: os.cpus().length
    };

    // If we have local processes, return them
    if (processes.length > 0) {
      return { processes, system, source: 'local' };
    }
  } catch (error) {
    console.log('Local PM2 not available, checking linked servers...');
  }

  // If local PM2 is not available, try to get data from linked servers
  const linkedServers = await getLinkedServers();
  const activeServers = linkedServers.filter(s => s.isActive && s.pm2Data && s.pm2Data.length > 0);
  
  if (activeServers.length > 0) {
    // Use the most recently active server
    const mostRecentServer = activeServers.sort((a, b) => b.lastSeen - a.lastSeen)[0];
    
    const processes: PM2Process[] = (mostRecentServer.pm2Data || []).map((proc: any) => ({
      pid: proc.pid || 0,
      name: proc.name,
      pm_id: proc.pm_id,
      status: proc.pm2_env?.status || 'unknown',
      restart_time: proc.pm2_env?.restart_time || 0,
      created_at: proc.pm2_env?.created_at || Date.now(),
      pm2_env: proc.pm2_env || {},
      monit: {
        memory: proc.monit?.memory || 0,
        cpu: proc.monit?.cpu || 0
      }
    }));

    const system: SystemInfo = {
      hostname: mostRecentServer.systemInfo?.hostname || mostRecentServer.hostname,
      uptime: mostRecentServer.systemInfo?.uptime || 0,
      totalmem: mostRecentServer.systemInfo?.totalmem || 0,
      freemem: mostRecentServer.systemInfo?.freemem || 0,
      loadavg: mostRecentServer.systemInfo?.loadavg || [0, 0, 0],
      cpu_count: mostRecentServer.systemInfo?.cpu_count || 1
    };

    return { 
      processes, 
      system, 
      source: 'linked',
      serverName: mostRecentServer.name
    };
  }

  // Fallback to local system info with no processes
  return {
    processes: [],
    system: {
      hostname: os.hostname(),
      uptime: os.uptime(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpu_count: os.cpus().length
    },
    source: 'local'
  };
}

export async function GET() {
  try {
    const { processes, system, source, serverName } = await getBestPM2Data();
    
    return NextResponse.json({
      success: true,
      data: {
        processes,
        system,
        source,
        serverName,
        timestamp: Date.now()
      }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch PM2 data',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, processId } = await request.json();
    
    let command = '';
    switch (action) {
      case 'start':
        command = `pm2 start ${processId}`;
        break;
      case 'stop':
        command = `pm2 stop ${processId}`;
        break;
      case 'restart':
        command = `pm2 restart ${processId}`;
        break;
      case 'delete':
        command = `pm2 delete ${processId}`;
        break;
      case 'reload':
        command = `pm2 reload ${processId}`;
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const { stdout, stderr } = await execAsync(command);
    
    return NextResponse.json({
      success: true,
      message: `${action} executed successfully on process ${processId}`,
      output: stdout,
      error: stderr
    });
  } catch (error: any) {
    console.error('PM2 Action Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute PM2 command',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
