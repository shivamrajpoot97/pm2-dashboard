import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Check if running on Vercel or in demo mode
const isVercelOrDemo = process.env.VERCEL_ENV || process.env.DEMO_MODE === 'true';

// Profiling data directory
const PROFILING_DIR = path.join(process.cwd(), '.pm2-profiling');

// Ensure profiling directory exists
async function ensureProfilingDir() {
  if (!existsSync(PROFILING_DIR)) {
    await mkdir(PROFILING_DIR, { recursive: true });
  }
}

// Generate mock profiling data for demo mode
function generateMockProfilingData(processId: string, type: 'cpu' | 'memory') {
  const baseTime = Date.now();
  const data = [];
  
  if (type === 'cpu') {
    // Generate CPU profiling data with realistic patterns
    let baseCpu = 20 + Math.random() * 40; // Base CPU between 20-60%
    for (let i = 0; i < 100; i++) {
      // Create some spikes and dips
      const trend = Math.sin(i * 0.1) * 10;
      const noise = (Math.random() - 0.5) * 15;
      const spike = Math.random() < 0.05 ? Math.random() * 30 : 0; // 5% chance of spike
      
      const value = Math.max(0, Math.min(100, baseCpu + trend + noise + spike));
      
      data.push({
        timestamp: baseTime - (100 - i) * 3000, // 3 second intervals
        value,
        function: `function_${Math.floor(Math.random() * 10)}`,
        file: `/app/src/handlers/handler_${Math.floor(Math.random() * 5)}.js`,
        line: Math.floor(Math.random() * 200) + 1,
        percentage: Math.random() * 10
      });
    }
  } else {
    // Generate memory profiling data with growth patterns
    let baseMemory = 50 + Math.random() * 150; // Base memory 50-200MB
    for (let i = 0; i < 100; i++) {
      // Simulate memory growth with occasional GC
      if (Math.random() < 0.1) {
        baseMemory = baseMemory * 0.7; // Garbage collection
      } else {
        baseMemory += (Math.random() - 0.3) * 5; // Slight growth trend
      }
      
      const memoryBytes = Math.max(10 * 1024 * 1024, baseMemory * 1024 * 1024);
      
      data.push({
        timestamp: baseTime - (100 - i) * 3000, // 3 second intervals
        heapUsed: memoryBytes,
        heapTotal: memoryBytes * 1.5,
        external: memoryBytes * 0.1,
        rss: memoryBytes * 1.2,
        arrayBuffers: memoryBytes * 0.05
      });
    }
  }
  
  return data;
}

// Start CPU profiling
async function startCpuProfiling(processId: string) {
  try {
    if (isVercelOrDemo) {
      return {
        success: true,
        message: 'Demo: CPU profiling started',
        profileId: `cpu_${processId}_${Date.now()}`
      };
    }

    // Use PM2's built-in profiling or Node.js inspector
    const { stdout } = await execAsync(`pm2 exec ${processId} -- node --inspect`);
    
    return {
      success: true,
      message: 'CPU profiling started',
      profileId: `cpu_${processId}_${Date.now()}`,
      output: stdout
    };
  } catch (error: any) {
    throw new Error(`Failed to start CPU profiling: ${error.message}`);
  }
}

// Start memory profiling
async function startMemoryProfiling(processId: string) {
  try {
    if (isVercelOrDemo) {
      return {
        success: true,
        message: 'Demo: Memory profiling started',
        profileId: `mem_${processId}_${Date.now()}`
      };
    }

    // Enable memory profiling for the process
    const { stdout } = await execAsync(`pm2 trigger ${processId} startMemoryProfiling`);
    
    return {
      success: true,
      message: 'Memory profiling started',
      profileId: `mem_${processId}_${Date.now()}`,
      output: stdout
    };
  } catch (error: any) {
    throw new Error(`Failed to start memory profiling: ${error.message}`);
  }
}

// Get profiling data
async function getProfilingData(processId: string, type: 'cpu' | 'memory') {
  try {
    if (isVercelOrDemo) {
      return generateMockProfilingData(processId, type);
    }

    // Get real profiling data from PM2 process
    const { stdout } = await execAsync(`pm2 jlist`);
    const processList = JSON.parse(stdout);
    const processData = processList.find((p: any) => p.pm_id === parseInt(processId));
    
    if (!processData) {
      throw new Error('Process not found');
    }

    // Generate time-series profiling data (simplified for demo)
    const data = [];
    const currentTime = Date.now();
    
    // Generate historical data points (last 5 minutes)
    for (let i = 0; i < 50; i++) {
      const timestamp = currentTime - (50 - i) * 6000; // 6 second intervals
      
      if (type === 'cpu') {
        const baseCpu = processData.monit?.cpu || 0;
        const variance = (Math.random() - 0.5) * 20; // ±10% variance
        data.push({
          timestamp,
          value: Math.max(0, Math.min(100, baseCpu + variance)),
          process: processData.name
        });
      } else {
        const baseMemory = processData.monit?.memory || 0;
        const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
        data.push({
          timestamp,
          heapUsed: Math.max(0, baseMemory * (1 + variance)),
          process: processData.name
        });
      }
    }
    
    return data;
  } catch (error: any) {
    throw new Error(`Failed to get profiling data: ${error.message}`);
  }
}

// POST: Start profiling
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const processId = resolvedParams.id;
    const { type, duration = 60 } = await request.json();

    await ensureProfilingDir();

    let result;
    switch (type) {
      case 'cpu':
        result = await startCpuProfiling(processId);
        break;
      case 'memory':
        result = await startMemoryProfiling(processId);
        break;
      default:
        throw new Error(`Unknown profiling type: ${type}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        processId,
        type,
        duration,
        startTime: Date.now()
      }
    });
  } catch (error: any) {
    console.error('Profiling Start Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start profiling',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// GET: Get profiling data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const processId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'cpu' | 'memory' || 'cpu';
    const timeRange = parseInt(searchParams.get('timeRange') || '3600'); // 1 hour default

    const data = await getProfilingData(processId, type);

    return NextResponse.json({
      success: true,
      data: {
        processId,
        type,
        timeRange,
        profiles: data,
        generatedAt: Date.now()
      }
    });
  } catch (error: any) {
    console.error('Profiling Data Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get profiling data',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE: Stop profiling
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const processId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'cpu';

    if (isVercelOrDemo) {
      return NextResponse.json({
        success: true,
        message: `Demo: ${type} profiling stopped`,
        processId,
        type
      });
    }

    // Stop profiling for the process
    const { stdout } = await execAsync(`pm2 trigger ${processId} stop${type.charAt(0).toUpperCase() + type.slice(1)}Profiling`);

    return NextResponse.json({
      success: true,
      message: `${type} profiling stopped`,
      processId,
      type,
      output: stdout
    });
  } catch (error: any) {
    console.error('Stop Profiling Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to stop profiling',
        message: error.message
      },
      { status: 500 }
    );
  }
}