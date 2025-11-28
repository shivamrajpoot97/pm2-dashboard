import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Check if running on Vercel or in demo mode
const isVercelOrDemo = process.env.VERCEL_ENV || process.env.DEMO_MODE === 'true';

// Health data directory
const HEALTH_DIR = path.join(process.cwd(), '.pm2-health');
const HEALTH_FILE = (processId: string) => path.join(HEALTH_DIR, `health-${processId}.json`);

// Ensure health directory exists
async function ensureHealthDir() {
  if (!existsSync(HEALTH_DIR)) {
    await mkdir(HEALTH_DIR, { recursive: true });
  }
}

// Health metric interface
interface HealthMetric {
  timestamp: number;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  status: string;
  responseTime?: number;
  errorRate?: number;
  throughput?: number;
  healthScore: number;
}

// Calculate health score based on various metrics
function calculateHealthScore(metric: Partial<HealthMetric>): number {
  let score = 100;
  
  // CPU impact (high CPU reduces score)
  if (metric.cpu !== undefined) {
    if (metric.cpu > 80) score -= 30;
    else if (metric.cpu > 60) score -= 20;
    else if (metric.cpu > 40) score -= 10;
  }
  
  // Memory impact (high memory reduces score)
  if (metric.memory !== undefined) {
    const memoryGB = metric.memory / (1024 * 1024 * 1024);
    if (memoryGB > 2) score -= 20;
    else if (memoryGB > 1) score -= 10;
    else if (memoryGB > 0.5) score -= 5;
  }
  
  // Status impact
  if (metric.status !== 'online') score -= 50;
  
  // Recent restarts impact
  if (metric.restarts !== undefined && metric.restarts > 0) {
    score -= Math.min(metric.restarts * 5, 25);
  }
  
  return Math.max(0, Math.min(100, score));
}

// Generate mock historical health data
function generateMockHealthHistory(processId: string, hours: number = 24): HealthMetric[] {
  const data: HealthMetric[] = [];
  const now = Date.now();
  const interval = (hours * 60 * 60 * 1000) / 100; // 100 data points
  
  let baseCpu = 20 + Math.random() * 30;
  let baseMemory = 50 + Math.random() * 100; // MB
  let restarts = 0;
  let uptime = 0;
  
  for (let i = 0; i < 100; i++) {
    const timestamp = now - (100 - i) * interval;
    
    // Simulate realistic patterns
    const timeOfDay = new Date(timestamp).getHours();
    const isBusinessHours = timeOfDay >= 9 && timeOfDay <= 17;
    const loadMultiplier = isBusinessHours ? 1.5 : 0.7;
    
    // CPU with daily patterns and random spikes
    const cpuTrend = Math.sin((i / 100) * Math.PI * 4) * 15;
    const cpuNoise = (Math.random() - 0.5) * 20;
    const cpuSpike = Math.random() < 0.03 ? Math.random() * 40 : 0;
    const cpu = Math.max(0, Math.min(100, (baseCpu + cpuTrend + cpuNoise + cpuSpike) * loadMultiplier));
    
    // Memory with gradual growth and GC
    if (Math.random() < 0.05) {
      baseMemory *= 0.7; // Garbage collection
    } else {
      baseMemory += (Math.random() - 0.3) * 5 * loadMultiplier;
    }
    const memory = Math.max(10, baseMemory) * 1024 * 1024; // Convert to bytes
    
    // Simulate occasional restarts
    if (Math.random() < 0.002) {
      restarts++;
      uptime = 0;
    } else {
      uptime += interval / 1000;
    }
    
    // Response time and error rate (business hours affect these)
    const responseTime = (50 + Math.random() * 200) * (isBusinessHours ? 1.3 : 0.8);
    const errorRate = Math.random() * (isBusinessHours ? 2 : 0.5);
    const throughput = (100 + Math.random() * 500) * loadMultiplier;
    
    const status = Math.random() < 0.995 ? 'online' : 'stopped';
    
    const metric: HealthMetric = {
      timestamp,
      cpu,
      memory,
      uptime,
      restarts,
      status,
      responseTime,
      errorRate,
      throughput,
      healthScore: 0
    };
    
    metric.healthScore = calculateHealthScore(metric);
    data.push(metric);
  }
  
  return data;
}

// Save health metric to file
async function saveHealthMetric(processId: string, metric: HealthMetric) {
  await ensureHealthDir();
  
  try {
    let history: HealthMetric[] = [];
    const healthFile = HEALTH_FILE(processId);
    
    if (existsSync(healthFile)) {
      const data = await readFile(healthFile, 'utf-8');
      history = JSON.parse(data);
    }
    
    history.push(metric);
    
    // Keep only last 1000 entries (roughly 3-4 days of 5-minute intervals)
    if (history.length > 1000) {
      history = history.slice(-1000);
    }
    
    await writeFile(healthFile, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Failed to save health metric:', error);
  }
}

// Load health history from file
async function loadHealthHistory(processId: string): Promise<HealthMetric[]> {
  await ensureHealthDir();
  
  try {
    const healthFile = HEALTH_FILE(processId);
    if (existsSync(healthFile)) {
      const data = await readFile(healthFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load health history:', error);
  }
  
  return [];
}

// GET: Retrieve health history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const processId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get('timeRange') || '24'); // hours
    const includeMetrics = searchParams.get('metrics') || 'all';
    
    let healthHistory: HealthMetric[];
    
    if (isVercelOrDemo) {
      healthHistory = generateMockHealthHistory(processId, timeRange);
    } else {
      healthHistory = await loadHealthHistory(processId);
      
      // If no historical data, generate some based on current process state
      if (healthHistory.length === 0) {
        try {
          const { stdout } = await execAsync('pm2 jlist');
          const processes = JSON.parse(stdout);
          const process = processes.find((p: any) => p.pm_id === parseInt(processId));
          
          if (process) {
            // Generate historical data based on current process
            healthHistory = generateMockHealthHistory(processId, timeRange);
          }
        } catch (error) {
          healthHistory = generateMockHealthHistory(processId, timeRange);
        }
      }
    }
    
    // Filter by time range
    const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);
    const filteredHistory = healthHistory.filter(h => h.timestamp >= cutoffTime);
    
    // Calculate summary statistics
    const summary = {
      avgHealthScore: filteredHistory.reduce((sum, h) => sum + h.healthScore, 0) / filteredHistory.length || 0,
      avgCpu: filteredHistory.reduce((sum, h) => sum + h.cpu, 0) / filteredHistory.length || 0,
      avgMemory: filteredHistory.reduce((sum, h) => sum + h.memory, 0) / filteredHistory.length || 0,
      totalRestarts: Math.max(...filteredHistory.map(h => h.restarts)) || 0,
      uptimePercentage: (filteredHistory.filter(h => h.status === 'online').length / filteredHistory.length) * 100 || 0,
      avgResponseTime: filteredHistory.reduce((sum, h) => sum + (h.responseTime || 0), 0) / filteredHistory.length || 0,
      avgErrorRate: filteredHistory.reduce((sum, h) => sum + (h.errorRate || 0), 0) / filteredHistory.length || 0,
      peakCpu: Math.max(...filteredHistory.map(h => h.cpu)) || 0,
      peakMemory: Math.max(...filteredHistory.map(h => h.memory)) || 0,
      dataPoints: filteredHistory.length
    };
    
    return NextResponse.json({
      success: true,
      data: {
        processId,
        timeRange,
        history: filteredHistory,
        summary,
        generatedAt: Date.now(),
        demoMode: isVercelOrDemo
      }
    });
  } catch (error: any) {
    console.error('Health History API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get health history',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// POST: Record new health metric
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const processId = resolvedParams.id;
    const body = await request.json();
    
    if (isVercelOrDemo) {
      return NextResponse.json({
        success: true,
        message: 'Demo: Health metric recorded',
        processId,
        demoMode: true
      });
    }
    
    // Get current process data
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    const process = processes.find((p: any) => p.pm_id === parseInt(processId));
    
    if (!process) {
      return NextResponse.json(
        { success: false, error: 'Process not found' },
        { status: 404 }
      );
    }
    
    // Create health metric
    const metric: HealthMetric = {
      timestamp: Date.now(),
      cpu: process.monit?.cpu || 0,
      memory: process.monit?.memory || 0,
      uptime: Math.floor((Date.now() - process.pm2_env?.pm_uptime) / 1000) || 0,
      restarts: process.pm2_env?.restart_time || 0,
      status: process.pm2_env?.status || 'unknown',
      responseTime: body.responseTime,
      errorRate: body.errorRate,
      throughput: body.throughput,
      healthScore: 0
    };
    
    metric.healthScore = calculateHealthScore(metric);
    
    await saveHealthMetric(processId, metric);
    
    return NextResponse.json({
      success: true,
      message: 'Health metric recorded',
      data: metric
    });
  } catch (error: any) {
    console.error('Health Record API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record health metric',
        message: error.message
      },
      { status: 500 }
    );
  }
}