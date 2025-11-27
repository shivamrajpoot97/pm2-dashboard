import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('processId');
    const lines = searchParams.get('lines') || '100';
    const type = searchParams.get('type') || 'out'; // 'out', 'err', or 'all'
    
    if (!processId) {
      return NextResponse.json(
        { success: false, error: 'Process ID is required' },
        { status: 400 }
      );
    }

    // Get process information first to get log paths
    const { stdout: processInfo } = await execAsync(`pm2 show ${processId} --format json`);
    const processData = JSON.parse(processInfo);
    
    if (!processData || processData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Process not found' },
        { status: 404 }
      );
    }

    const process = processData[0];
    const outLogPath = process.pm2_env?.pm_out_log_path;
    const errLogPath = process.pm2_env?.pm_err_log_path;
    
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
          process: process.name
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
          process: process.name
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
        processName: process.name,
        processId: process.pm_id,
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
