import {NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Check if running on Vercel or in demo mode
const isVercelOrDemo = process.env.VERCEL_ENV || process.env.DEMO_MODE === 'true';

// Generate mock logs for demo mode
function generateMockLogs(processId: string, lines: number, type: string) {
  const logs: any[] = [];
  const processNames = ['web-server', 'api-gateway', 'auth-service', 'database-worker', 'redis-client', 'notification-service', 'file-processor', 'analytics-engine'];
  const processName = processNames[parseInt(processId) % processNames.length] || 'demo-process';
  
  const logMessages = [
    'Server started successfully on port 3000',
    'Database connection established',
    'Processing request for user authentication',
    'Cache hit for key: user_session_123',
    'API endpoint /health responded in 15ms',
    'Processing batch job with 250 items',
    'Memory usage: 145MB, CPU: 12%',
    'Request completed successfully',
    'Scheduled task executed at',
    'Connection pool: 8/20 active connections'
  ];
  
  const errorMessages = [
    'Warning: High memory usage detected',
    'Error: Database connection timeout',
    'Failed to process request: Invalid token',
    'Connection refused to external API',
    'Rate limit exceeded for IP'
  ];
  
  for (let i = 0; i < Math.min(lines, 50); i++) {
    const isError = Math.random() < 0.1; // 10% chance of error
    const timestamp = new Date(Date.now() - (i * 30000 + Math.random() * 30000)).toISOString();
    
    if (type === 'err' || (type === 'all' && isError)) {
      logs.push({
        timestamp,
        level: 'error',
        message: `[${timestamp}] ERROR: ${errorMessages[Math.floor(Math.random() * errorMessages.length)]}`,
        type: 'stderr',
        process: processName
      });
    }
    
    if (type === 'out' || (type === 'all' && !isError)) {
      logs.push({
        timestamp,
        level: 'info',
        message: `[${timestamp}] INFO: ${logMessages[Math.floor(Math.random() * logMessages.length)]} ${new Date(timestamp).toLocaleTimeString()}`,
        type: 'stdout',
        process: processName
      });
    }
  }
  
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('processId');
    const lines = parseInt(searchParams.get('lines') || '100');
    const type = searchParams.get('type') || 'out'; // 'out', 'err', or 'all'
    
    if (!processId) {
      return NextResponse.json(
        { success: false, error: 'Process ID is required' },
        { status: 400 }
      );
    }

    // Return demo logs if in Vercel/demo mode
    if (isVercelOrDemo) {
      const logs = generateMockLogs(processId, lines, type);
      return NextResponse.json({
        success: true,
        data: {
          logs,
          processName: `demo-process-${processId}`,
          processId: parseInt(processId),
          logPaths: {
            stdout: `/app/logs/demo-process-${processId}-out.log`,
            stderr: `/app/logs/demo-process-${processId}-error.log`
          },
          demoMode: true,
          message: 'These are demo logs. Deploy to a server with PM2 for real logs.'
        }
      });
    }

    // Get process information first to get log paths
    // Build dynamic PM2 paths based on environment
    const pm2Paths = [];
    
    // Add Node.js/npm/yarn bin directories from PATH
    if (process.env.PATH) {
      const pathDirs = process.env.PATH.split(path.delimiter);
      pathDirs.forEach(dir => {
        if (dir.includes('node') || dir.includes('.nvm') || dir.includes('npm') || dir.includes('yarn')) {
          pm2Paths.push(path.join(dir, 'pm2'));
        }
      });
    }
    
    // Add common system locations
    pm2Paths.push(
      'pm2', // This will use PATH resolution
      '/usr/local/bin/pm2',
      '/usr/bin/pm2',
      'npx pm2' // Use npx as fallback
    );
    
    // Add user-specific locations
    if (process.env.HOME) {
      pm2Paths.push(
        path.join(process.env.HOME, '.npm-global', 'bin', 'pm2'),
        path.join(process.env.HOME, 'node_modules', '.bin', 'pm2')
      );
    }
    
    // Try NVM paths if available
    if (process.env.NVM_DIR && process.env.NVM_BIN) {
      pm2Paths.unshift(path.join(process.env.NVM_BIN, 'pm2')); // Add at beginning for priority
    }
    
    let processInfo = '';
    let lastError;
    for (const pm2Path of pm2Paths) {
      try {
        const result = await execAsync(`${pm2Path} jlist`, {
          timeout: 5000,
          env: { ...process.env, PATH: process.env.PATH }
        });
        processInfo = result.stdout;
        break;
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    
    if (!processInfo) {
      throw lastError || new Error('PM2 not found');
    }
    
    const allProcesses = JSON.parse(processInfo);
    const processData = allProcesses.filter((p: any) => p.pm_id.toString() === processId.toString());
    
    if (!processData || processData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Process not found' },
        { status: 404 }
      );
    }

    const processDetails = processData[0];
    const outLogPath = processDetails.pm2_env?.pm_out_log_path;
    const errLogPath = processDetails.pm2_env?.pm_err_log_path;
    
    let logs: any[] = [];

    // Read stdout logs
    if ((type === 'out' || type === 'all') && outLogPath) {
      try {
        const { stdout } = await execAsync(`tail -n ${lines} "${outLogPath}"`);
        const outLines = stdout.split('\n').filter(line => line.trim());
        logs.push(...outLines.map(line => ({
          timestamp: extractTimestamp(line),
          level: extractLogLevel(line),
          message: line,
          type: 'stdout',
          process: processDetails.name
        })));
      } catch (error) {
        console.warn('Could not read stdout log:', error);
      }
    }

    // Read stderr logs
    if ((type === 'err' || type === 'all') && errLogPath) {
      try {
        const { stdout } = await execAsync(`tail -n ${lines} "${errLogPath}"`);
        const errLines = stdout.split('\n').filter(line => line.trim());
        logs.push(...errLines.map(line => ({
          timestamp: extractTimestamp(line),
          level: 'error',
          message: line,
          type: 'stderr',
          process: processDetails.name
        })));
      } catch (error) {
        console.warn('Could not read stderr log:', error);
      }
    }

    // Sort logs by timestamp
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: {
        logs,
        processName: processDetails.name,
        processId: processDetails.pm_id,
        logPaths: {
          stdout: outLogPath,
          stderr: errLogPath
        }
      }
    });
  } catch (error: any) {
    console.error('Logs API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch logs',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to extract timestamp from log line
function extractTimestamp(logLine: string): string {
  // Try to extract ISO timestamp
  const isoMatch = logLine.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  if (isoMatch) {
    return isoMatch[0];
  }
  
  // Try to extract other common timestamp formats
  const dateMatch = logLine.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  if (dateMatch) {
    return new Date(dateMatch[0]).toISOString();
  }
  
  // Default to current time if no timestamp found
  return new Date().toISOString();
}

// Helper function to extract log level
function extractLogLevel(logLine: string): 'info' | 'warn' | 'error' | 'debug' {
  const lowerLine = logLine.toLowerCase();
  
  if (lowerLine.includes('error') || lowerLine.includes('err')) return 'error';
  if (lowerLine.includes('warn') || lowerLine.includes('warning')) return 'warn';
  if (lowerLine.includes('debug')) return 'debug';
  
  return 'info';
}

// POST endpoint for streaming logs (WebSocket alternative)
export async function POST(request: NextRequest) {
  try {
    const { processId, follow = false } = await request.json();
    
    if (!processId) {
      return NextResponse.json(
        { success: false, error: 'Process ID is required' },
        { status: 400 }
      );
    }

    // Return demo streaming logs if in Vercel/demo mode
    if (isVercelOrDemo) {
      const logs = generateMockLogs(processId, 20, 'all'); // Fewer logs for streaming
      return NextResponse.json({
        success: true,
        data: {
          logs,
          demoMode: true,
          message: 'Demo streaming logs. Real-time updates available on servers with PM2.'
        }
      });
    }

    // If follow is true, use pm2 logs command for real-time streaming
    if (follow) {
      const command = `pm2 logs ${processId} --lines 50 --raw`;
      const { stdout } = await execAsync(command);
      
      return NextResponse.json({
        success: true,
        data: {
          logs: stdout.split('\n').filter(line => line.trim()).map(line => ({
            timestamp: extractTimestamp(line),
            level: extractLogLevel(line),
            message: line,
            type: 'live'
          }))
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Follow mode not implemented in POST' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to stream logs',
        message: error.message 
      },
      { status: 500 }
    );
  }
}


