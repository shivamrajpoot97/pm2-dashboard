import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Simple in-memory storage for historical data (in production, use Redis/Database)
let historicalData: any[] = [];

// Collect current system metrics
async function collectSystemMetrics() {
  const timestamp = Date.now();
  
  try {
    const systemInfo = {
      hostname: os.hostname(),
      uptime: os.uptime(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpu_count: os.cpus().length
    };
    
    // Get PM2 process info
    let pm2Data = [];
    try {
      const { stdout } = await execAsync('pm2 jlist');
      if (stdout.trim()) {
        pm2Data = JSON.parse(stdout);
      }
    } catch (error) {
      console.warn('Could not fetch PM2 data:', (error as Error).message);
    }
    
    // Calculate aggregated metrics
    const totalCpu = pm2Data.reduce((sum: number, p: any) => sum + (p.monit?.cpu || 0), 0);
    const totalMemory = pm2Data.reduce((sum: number, p: any) => sum + (p.monit?.memory || 0), 0);
    const memoryUsagePercent = ((systemInfo.totalmem - systemInfo.freemem) / systemInfo.totalmem) * 100;
    
    // Get network stats (simplified)
    let networkStats = { rx: 0, tx: 0 };
    try {
      // Try to get network stats from /proc/net/dev on Linux
      if (process.platform === 'linux') {
        const netData = await fs.readFile('/proc/net/dev', 'utf-8');
        const lines = netData.split('\n');
        let totalRx = 0, totalTx = 0;
        
        lines.forEach(line => {
          if (line.includes(':') && !line.includes('lo:')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 10) {
              totalRx += parseInt(parts[1]) || 0;
              totalTx += parseInt(parts[9]) || 0;
            }
          }
        });
        
        networkStats = { rx: totalRx, tx: totalTx };
      }
    } catch (error) {
      // Network stats not available
    }
    
    // Get disk I/O stats (simplified)
    let diskStats = { reads: 0, writes: 0 };
    try {
      if (process.platform === 'linux') {
        const { stdout } = await execAsync('iostat -d 1 2 | tail -n +4 | head -n -1 | awk \'{ reads += $3; writes += $4 } END { print reads, writes }\'');
        const [reads, writes] = stdout.trim().split(' ').map(Number);
        diskStats = { reads: reads || 0, writes: writes || 0 };
      }
    } catch (error) {
      // Disk stats not available
    }
    
    const metrics = {
      timestamp,
      system: {
        cpu: {
          usage: totalCpu,
          loadAvg: systemInfo.loadavg[0],
          cores: systemInfo.cpu_count
        },
        memory: {
          total: systemInfo.totalmem,
          free: systemInfo.freemem,
          used: systemInfo.totalmem - systemInfo.freemem,
          usagePercent: memoryUsagePercent
        },
        disk: diskStats,
        network: networkStats,
        processes: {
          total: pm2Data.length,
          online: pm2Data.filter((p: any) => p.pm2_env?.status === 'online').length,
          pm2Memory: totalMemory
        }
      },
      processes: pm2Data.map((proc: any) => ({
        pm_id: proc.pm_id,
        name: proc.name,
        cpu: proc.monit?.cpu || 0,
        memory: proc.monit?.memory || 0,
        status: proc.pm2_env?.status || 'unknown',
        restarts: proc.pm2_env?.restart_time || 0
      }))
    };
    
    // Store in memory (limit to last 1000 entries)
    historicalData.push(metrics);
    if (historicalData.length > 1000) {
      historicalData = historicalData.slice(-1000);
    }
    
    return metrics;
  } catch (error) {
    console.error('Error collecting metrics:', error);
    return null;
  }
}

// Start collecting metrics every 30 seconds
setInterval(collectSystemMetrics, 30000);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';
    const processId = searchParams.get('processId');
    
    // Calculate time range
    const now = Date.now();
    let startTime: number;
    
    switch (period) {
      case '1h':
        startTime = now - (60 * 60 * 1000);
        break;
      case '24h':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case '1w':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
    }
    
    // Filter data by time range
    const filteredData = historicalData.filter(d => d.timestamp >= startTime);
    
    // If no historical data, collect current metrics and return basic response
    if (filteredData.length === 0) {
      const currentMetrics = await collectSystemMetrics();
      return NextResponse.json({
        success: true,
        data: {
          period,
          dataPoints: currentMetrics ? [currentMetrics] : [],
          summary: {
            totalPoints: currentMetrics ? 1 : 0,
            timeRange: { start: startTime, end: now },
            message: 'Historical data collection starting. More data will be available over time.'
          }
        }
      });
    }
    
    // If requesting specific process data
    if (processId) {
      const processData = filteredData.map(d => {
        const process = d.processes.find((p: any) => p.pm_id === parseInt(processId));
        return {
          timestamp: d.timestamp,
          process: process || null
        };
      }).filter(d => d.process);
      
      return NextResponse.json({
        success: true,
        data: {
          period,
          processId: parseInt(processId),
          dataPoints: processData,
          summary: {
            totalPoints: processData.length,
            timeRange: { start: startTime, end: now }
          }
        }
      });
    }
    
    // Return system-wide data
    return NextResponse.json({
      success: true,
      data: {
        period,
        dataPoints: filteredData,
        summary: {
          totalPoints: filteredData.length,
          timeRange: { start: startTime, end: now },
          latestMetrics: filteredData[filteredData.length - 1]?.system || null
        }
      }
    });
    
  } catch (error: any) {
    console.error('Historical data API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch historical data',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// Initialize data collection
collectSystemMetrics();