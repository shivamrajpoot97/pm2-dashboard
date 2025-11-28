import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Check if running on Vercel or in demo mode
const isVercelOrDemo = process.env.VERCEL_ENV || process.env.DEMO_MODE === 'true';

// Helper function to get git information
async function getGitInfo() {
  try {
    // Get git remote URL
    const { stdout: remoteUrl } = await execAsync('git remote get-url origin 2>/dev/null || echo "No remote configured"');
    
    // Get latest commit info
    const { stdout: commitInfo } = await execAsync('git log -1 --pretty=format:\'{"commit":"%H","short_commit":"%h","author":"%an","email":"%ae","date":"%ai","message":"%s"}\' 2>/dev/null || echo "{}"');
    
    // Get current branch
    const { stdout: currentBranch } = await execAsync('git branch --show-current 2>/dev/null || echo "unknown"');
    
    let parsedCommitInfo = {};
    try {
      parsedCommitInfo = JSON.parse(commitInfo.trim() || '{}');
    } catch {
      parsedCommitInfo = {};
    }
    
    // Convert SSH URL to HTTPS for display
    let displayUrl = remoteUrl.trim();
    if (displayUrl.startsWith('git@github.com:')) {
      displayUrl = displayUrl.replace('git@github.com:', 'https://github.com/');
      if (displayUrl.endsWith('.git')) {
        displayUrl = displayUrl.slice(0, -4);
      }
    }
    
    return {
      repository_url: displayUrl,
      branch: currentBranch.trim(),
      commit: parsedCommitInfo.commit || 'unknown',
      short_commit: parsedCommitInfo.short_commit || 'unknown',
      commit_message: parsedCommitInfo.message || 'No commit message',
      commit_author: parsedCommitInfo.author || 'Unknown',
      commit_email: parsedCommitInfo.email || '',
      commit_date: parsedCommitInfo.date || 'Unknown'
    };
  } catch (error) {
    console.warn('Failed to get git info:', error);
    return {
      repository_url: 'Not available',
      branch: 'unknown',
      commit: 'unknown',
      short_commit: 'unknown',
      commit_message: 'Git information not available',
      commit_author: 'Unknown',
      commit_email: '',
      commit_date: 'Unknown'
    };
  }
}

// Generate mock process details for demo mode
function generateMockProcessDetails(processId: string) {
  const processNames = ['web-server', 'api-gateway', 'auth-service', 'database-worker', 'redis-client', 'notification-service', 'file-processor', 'analytics-engine'];
  const processName = processNames[parseInt(processId) % processNames.length] || 'demo-process';
  
  const uptime = Math.floor(Math.random() * 86400 * 7); // Random uptime up to 7 days
  const memory = Math.floor(Math.random() * 200 + 50) * 1024 * 1024; // 50-250MB
  const cpu = Math.random() * 30; // 0-30%
  
  return {
    basic: {
      pid: 1000 + parseInt(processId),
      name: `${processName}-${processId}`,
      pm_id: parseInt(processId),
      status: 'online',
      uptime,
      restarts: Math.floor(Math.random() * 5),
      unstable_restarts: Math.floor(Math.random() * 2)
    },
    resources: {
      cpu,
      memory,
      heap_size: `${Math.floor(memory / 1024 / 1024 * 0.8)}MB`,
      heap_usage: `${Math.floor(Math.random() * 100)}%`,
      used_heap_size: `${Math.floor(memory / 1024 / 1024 * 0.6)}MB`,
      active_handles: `${Math.floor(Math.random() * 20)}`,
      active_requests: `${Math.floor(Math.random() * 10)}`
    },
    performance: {
      loop_delay: `${(Math.random() * 2).toFixed(2)}ms`,
      event_loop_latency: `${(Math.random() * 5).toFixed(2)}ms`,
      http_mean_latency: `${(Math.random() * 100).toFixed(2)}ms`,
      http_p95_latency: `${(Math.random() * 300).toFixed(2)}ms`
    },
    environment: {
      node_version: '18.17.0',
      exec_interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      pm_exec_path: `/app/${processName}/index.js`,
      pm_cwd: `/app/${processName}`,
      args: ['--port', '3000'],
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        API_KEY: '***HIDDEN***'
      }
    },
    logs: {
      out_log_path: `/app/logs/${processName}-out.log`,
      err_log_path: `/app/logs/${processName}-error.log`,
      pid_path: `/app/pids/${processName}.pid`,
      merge_logs: false
    },
    timestamps: {
      created_at: Date.now() - uptime * 1000,
      pm_uptime: Date.now() - uptime * 1000,
      last_restart: Date.now() - Math.floor(Math.random() * uptime * 1000)
    },
    monitoring: {
      'Loop delay': { value: `${(Math.random() * 2).toFixed(2)}ms`, type: 'internal', unit: 'ms', historic: true },
      'Used Heap Size': { value: `${Math.floor(memory / 1024 / 1024 * 0.6)}MB`, type: 'internal', unit: 'MB', historic: true },
      'Heap Usage': { value: Math.floor(Math.random() * 100), type: 'internal', unit: '%', historic: true }
    }
  };
}

// Helper function to safely get metric value
function getMetricValue(metrics: any, key: string): string {
  try {
    return metrics?.[key]?.value || 'N/A';
  } catch {
    return 'N/A';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const processId = resolvedParams.id;
    
    // Get git information
    const gitInfo = await getGitInfo();
    
    // Return demo process details if in Vercel/demo mode
    if (isVercelOrDemo) {
      const detailedInfo = generateMockProcessDetails(processId);
      return NextResponse.json({
        success: true,
        data: {
          ...detailedInfo,
          git: gitInfo,
          demoMode: true,
          message: 'This is demo process data. Deploy to a server with PM2 for real process details.'
        }
      });
    }
    
    // Get all processes in JSON format
    const { stdout } = await execAsync('pm2 jlist');
    const processList = JSON.parse(stdout);
    
    // Find the specific process by ID
    const process = processList.find((p: any) => p.pm_id === parseInt(processId));
    
    if (!process) {
      return NextResponse.json(
        { success: false, error: 'Process not found' },
        { status: 404 }
      );
    }

    // Extract metrics from axm_monitor if available
    const metrics = process.pm2_env?.axm_monitor || {};

    // Calculate uptime
    const uptime = process.pm2_env?.pm_uptime 
      ? Math.floor((Date.now() - process.pm2_env.pm_uptime) / 1000)
      : 0;

    const detailedInfo = {
      basic: {
        pid: process.pid,
        name: process.name,
        pm_id: process.pm_id,
        status: process.pm2_env?.status,
        uptime,
        restarts: process.pm2_env?.restart_time || 0,
        unstable_restarts: process.pm2_env?.unstable_restarts || 0
      },
      resources: {
        cpu: process.monit?.cpu || 0,
        memory: process.monit?.memory || 0,
        heap_size: getMetricValue(metrics, 'Heap Size'),
        heap_usage: getMetricValue(metrics, 'Heap Usage'),
        used_heap_size: getMetricValue(metrics, 'Used Heap Size'),
        active_handles: getMetricValue(metrics, 'Active handles'),
        active_requests: getMetricValue(metrics, 'Active requests')
      },
      performance: {
        loop_delay: getMetricValue(metrics, 'Loop delay'),
        event_loop_latency: getMetricValue(metrics, 'Event Loop Latency'),
        http_mean_latency: getMetricValue(metrics, 'HTTP Mean Latency'),
        http_p95_latency: getMetricValue(metrics, 'HTTP P95 Latency')
      },
      environment: {
        node_version: process.pm2_env?.node_version || process.pm2_env?.version,
        exec_interpreter: process.pm2_env?.exec_interpreter,
        exec_mode: process.pm2_env?.exec_mode,
        instances: process.pm2_env?.instances,
        pm_exec_path: process.pm2_env?.pm_exec_path,
        pm_cwd: process.pm2_env?.pm_cwd,
        args: process.pm2_env?.args || [],
        env: filterEnvVars(process.pm2_env?.env || {})
      },
      logs: {
        out_log_path: process.pm2_env?.pm_out_log_path,
        err_log_path: process.pm2_env?.pm_err_log_path,
        pid_path: process.pm2_env?.pm_pid_path,
        merge_logs: process.pm2_env?.merge_logs
      },
      timestamps: {
        created_at: process.pm2_env?.created_at,
        pm_uptime: process.pm2_env?.pm_uptime,
        last_restart: process.pm2_env?.restart_time
      },
      monitoring: metrics,
      git: gitInfo
    };

    return NextResponse.json({
      success: true,
      data: detailedInfo
    });
  } catch (error: any) {
    console.error('Process Details API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch process details',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to filter sensitive environment variables
function filterEnvVars(env: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password', 'secret', 'key', 'token', 'auth', 'api_key',
    'database_url', 'db_password', 'jwt_secret'
  ];
  
  const filtered: Record<string, any> = {};
  
  Object.keys(env).forEach(key => {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
    
    if (isSensitive) {
      filtered[key] = '***HIDDEN***';
    } else {
      filtered[key] = env[key];
    }
  });
  
  return filtered;
}

// PUT endpoint for updating process configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const processId = resolvedParams.id;
    const { action, ...options } = await request.json();
    
    // Return demo response if in Vercel/demo mode
    if (isVercelOrDemo) {
      return NextResponse.json({
        success: true,
        message: `Demo: Process ${processId} ${action} operation completed`,
        output: `[DEMO] ${action} operation simulated successfully`,
        error: '',
        demoMode: true
      });
    }
    
    let command = '';
    
    switch (action) {
      case 'scale':
        if (options.instances) {
          command = `pm2 scale ${processId} ${options.instances}`;
        }
        break;
      case 'env':
        // Update environment variables (requires process restart)
        if (options.env) {
          // This is complex and would require updating the ecosystem file
          throw new Error('Environment variable updates not implemented');
        }
        break;
      default:
        throw new Error(`Unknown update action: ${action}`);
    }
    
    if (command) {
      const { stdout, stderr } = await execAsync(command);
      
      return NextResponse.json({
        success: true,
        message: `Process ${processId} updated successfully`,
        output: stdout,
        error: stderr
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'No valid action provided' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update process',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
