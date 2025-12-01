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

// Function to find the correct PM2 executable path
function getPM2Paths(): string[] {
  const pm2Paths: string[] = [];
  
  if (process.env.PATH) {
    const pathDirs = process.env.PATH.split(path.delimiter);
    pathDirs.forEach(dir => {
      if (
        dir.includes('node') ||
        dir.includes('.nvm') ||
        dir.includes('npm') ||
        dir.includes('yarn')
      ) {
        pm2Paths.push(path.join(dir, 'pm2'));
      }
    });
  }
  
  // Common system locations + fallback to PATH resolution
  pm2Paths.push(
    'pm2',
    '/usr/local/bin/pm2',
    '/usr/bin/pm2',
    'npx pm2'
  );
  
  if (process.env.HOME) {
    pm2Paths.push(
      path.join(process.env.HOME, '.npm-global', 'bin', 'pm2'),
      path.join(process.env.HOME, 'node_modules', '.bin', 'pm2')
    );
  }
  
  if (process.env.NVM_DIR && process.env.NVM_BIN) {
    pm2Paths.unshift(path.join(process.env.NVM_BIN, 'pm2'));
  }
  return pm2Paths;
}

// Execute PM2 command by trying multiple possible paths
async function executePM2Command(
  command: string,
  timeoutMs: number = 5000
): Promise<{ stdout: string; stderr: string }> {
  const pm2Paths = getPM2Paths();
  let lastError: any = null;
  
  for (const pm2Path of pm2Paths) {
    try {
      const fullCommand = command.replace('pm2', pm2Path);
      const result = await execAsync(fullCommand, {
        timeout: timeoutMs,
        env: { ...process.env, PATH: process.env.PATH }
      });
      console.log(`Successfully executed: ${fullCommand}`);
      return result;
    } catch (err: any) {
      console.log(`Failed with ${pm2Path}: ${err.message}`);
      lastError = err;
    }
  }
  
  throw lastError || new Error('PM2 not found in any standard location');
}

// Read linked servers from .pm2-links/servers.json
async function getLinkedServers(): Promise<LinkedServer[]> {
  try {
    const linksFile = path.join(process.cwd(), '.pm2-links', 'servers.json');
    if (!existsSync(linksFile)) return [];
    const data = await readFile(linksFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Function to get Git information for a process
async function getGitInfo(processPath: string): Promise<any> {
  try {
    const results: any = {};
    try {
      const { stdout: remoteUrl } = await execAsync(
        'git remote get-url origin',
        { cwd: processPath, timeout: 3000 }
      );
      results.url = remoteUrl.trim();
    } catch {}
    try {
      const { stdout: branch } = await execAsync(
        'git branch --show-current',
        { cwd: processPath, timeout: 3000 }
      );
      results.branch = branch.trim();
    } catch {}
    try {
      const { stdout: longCommit } = await execAsync(
        'git rev-parse HEAD',
        { cwd: processPath, timeout: 3000 }
      );
      results.commit = { long: longCommit.trim() };
    } catch {}

    try {
      const { stdout: shortCommit } = await execAsync(
        'git rev-parse --short HEAD',
        { cwd: processPath, timeout: 3000 }
      );
      if (results.commit) {
        results.commit.short = shortCommit.trim();
      } else {
        results.commit = { short: shortCommit.trim() };
      }
    } catch {}

    // Commit message
    try {
      const { stdout: message } = await execAsync(
        'git log -1 --pretty=format:"%s"',
        { cwd: processPath, timeout: 3000 }
      );
      if (results.commit) {
        results.commit.message = message.trim().replace(/^"|"$/g, '');
      }
    } catch {}

    // Commit author name
    try {
      const { stdout: author } = await execAsync(
        'git log -1 --pretty=format:"%an"',
        { cwd: processPath, timeout: 3000 }
      );
      if (results.commit) {
        results.commit.author = author.trim().replace(/^"|"$/g, '');
      }
    } catch {}

    // Commit date (relative)
    try {
      const { stdout: date } = await execAsync(
        'git log -1 --pretty=format:"%cr"',
        { cwd: processPath, timeout: 3000 }
      );
      if (results.commit) {
        results.commit.date = date.trim().replace(/^"|"$/g, '');
      }
    } catch {}

    // Committer email
    try {
      const { stdout: email } = await execAsync(
        'git log -1 --pretty=format:"%ae"',
        { cwd: processPath, timeout: 3000 }
      );
      if (results.commit) {
        results.commit.email = email.trim().replace(/^"|"$/g, '');
      }
    } catch {}

    // Unstaged changes?
    try {
      const { stdout: status } = await execAsync(
        'git status --porcelain',
        { cwd: processPath, timeout: 3000 }
      );
      results.unstaged = status.trim().length > 0;
    } catch {}

    // Ahead of remote?
    try {
      const { stdout: ahead } = await execAsync(
        'git rev-list --count @{u}..HEAD',
        { cwd: processPath, timeout: 3000 }
      );
      results.ahead = parseInt(ahead.trim(), 10) > 0;
    } catch {}

    // Repo name from URL
    if (results.url) {
      try {
        const repoName = results.url
          .split('/')
          .pop()
          ?.replace('.git', '') || '';
        results.repoName = repoName;
      } catch {}
    }

    return Object.keys(results).length > 0 ? results : null;
  } catch {
    return null;
  }
}

// Fetch PM2 + system info, trying local first, then linked servers
async function getBestPM2Data(): Promise<{
  processes: PM2Process[];
  system: SystemInfo;
  source: 'local' | 'linked';
  serverName?: string;
}> {
  // Attempt local PM2
  try {
    console.log('Attempting local PM2...');
    const result = await executePM2Command('pm2 jlist');
    let processes: PM2Process[] = [];
    
    if (result.stdout.trim()) {
      const raw = JSON.parse(result.stdout);
      processes = await Promise.all(
        raw.map(async (proc: any) => {
          let gitInfo = null;
          if (proc.pm2_env?.pm_cwd) {
            gitInfo = await getGitInfo(proc.pm2_env.pm_cwd);
          }

          return {
            pid: proc.pid || 0,
            name: proc.name,
            pm_id: proc.pm_id,
            status: proc.pm2_env?.status || 'unknown',
            restart_time: proc.pm2_env?.restart_time || 0,
            created_at: proc.pm2_env?.created_at || Date.now(),
            pm2_env: {
              ...proc.pm2_env,
              versioning: gitInfo
            },
            monit: {
              memory: proc.monit?.memory || 0,
              cpu: proc.monit?.cpu || 0
            }
          } as PM2Process;
        })
      );
    }

    const system: SystemInfo = {
      hostname: os.hostname(),
      uptime: os.uptime(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpu_count: os.cpus().length
    };

    if (processes.length > 0) {
      return { processes, system, source: 'local' };
    }
  } catch {
    console.log('Local PM2 failed, falling back to linked servers...');
  }

  // Fallback: linked servers
  const linked = await getLinkedServers();
  const active = linked.filter(s => s.isActive && s.pm2Data?.length);

  if (active.length) {
    const recent = active.sort((a, b) => b.lastSeen - a.lastSeen)[0];
    const processes: PM2Process[] = (recent.pm2Data || []).map((proc: any) => ({
      pid: proc.pid || 0,
      name: proc.name,
      pm_id: proc.pm_id,
      status: proc.pm2_env?.status || 'unknown',
      restart_time: proc.pm2_env?.restart_time || 0,
      created_at: proc.pm2_env?.created_at || Date.now(),
      pm2_env: proc.pm2_env,
      monit: {
        memory: proc.monit?.memory || 0,
        cpu: proc.monit?.cpu || 0
      }
    }));

    const system: SystemInfo = {
      hostname: recent.systemInfo?.hostname || recent.hostname,
      uptime: recent.systemInfo?.uptime || 0,
      totalmem: recent.systemInfo?.totalmem || 0,
      freemem: recent.systemInfo?.freemem || 0,
      loadavg: recent.systemInfo?.loadavg || [0, 0, 0],
      cpu_count: recent.systemInfo?.cpu_count || 1
    };

    return {
      processes,
      system,
      source: 'linked',
      serverName: recent.name
    };
  }

  // Final fallback: no PM2 processes
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
      data: { processes, system, source, serverName, timestamp: Date.now() }
    });
  } catch (err: any) {
    console.error('GET /pm2 error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PM2 data', message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, processId, options } = await request.json();
    console.log(`Executing PM2 action "${action}" on ${processId}`);

    let cmd = '';
    switch (action) {
      case 'start':
        cmd = `pm2 start ${processId}`; break;
      case 'stop':
        cmd = `pm2 stop ${processId}`; break;
      case 'restart':
        cmd = `pm2 restart ${processId}`; break;
      case 'delete':
        cmd = `pm2 delete ${processId}`; break;
      case 'reload':
        cmd = `pm2 reload ${processId}`; break;
      case 'scale':
        if (options?.instances == null) {
          throw new Error('Instances required for scale');
        }
        cmd = `pm2 scale ${processId} ${options.instances}`; break;
      case 'reset':
        cmd = `pm2 reset ${processId}`; break;
      case 'flush':
        cmd = `pm2 flush ${processId}`; break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const result = await executePM2Command(cmd, 30000);
    return NextResponse.json({
      success: true,
      message: `${action} executed on ${processId}`,
      output: result.stdout,
      error: result.stderr
    });
  } catch (err: any) {
    console.error('POST /pm2 error:', err);
    return NextResponse.json(
      { success: false, error: 'PM2 command failed', message: err.message },
      { status: 500 }
    );
  }
}
