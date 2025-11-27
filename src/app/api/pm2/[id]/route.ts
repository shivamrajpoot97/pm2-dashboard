import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    
    // Get detailed process information
    const { stdout } = await execAsync(`pm2 show ${processId} --format json`);
    const processData = JSON.parse(stdout);
    
    if (!processData || processData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Process not found' },
        { status: 404 }
      );
    }

    const process = processData[0];
    
    // Get additional process metrics if available
    let metrics: any = {};
    try {
      const { stdout: metricsData } = await execAsync(`pm2 show ${processId} --format json`);
      const metricsJson = JSON.parse(metricsData);
      if (metricsJson[0]?.pm2_env?.axm_monitor) {
        metrics = metricsJson[0].pm2_env.axm_monitor;
      }
    } catch (error) {
      console.warn('Could not fetch metrics:', error);
    }

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
      monitoring: metrics
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
