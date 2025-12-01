import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { 
  loadProcessHealthHistory, 
  collectRealHealthMetrics, 
  getCurrentHealthStatus 
} from '@/lib/healthMonitor';

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

// Generate realistic health data with smooth transitions
function generateMockHealthHistory(processId: string, hours: number = 24): HealthMetric[] {
  const data: HealthMetric[] = [];
  const now = Date.now();
  const interval = (hours * 60 * 60 * 1000) / 100; // 100 data points
  
  // Base values that remain more stable
  let baseCpu = 15 + (parseInt(processId) % 20); // Stable base CPU per process
  let baseMemory = 80 + (parseInt(processId) % 50); // Stable base memory
  let baseHealthScore = 85 + (parseInt(processId) % 15); // Stable base health
  let restarts = Math.floor(parseInt(processId) / 3) % 2; // Some processes have restarts
  let uptime = hours * 3600; // Start with full uptime
  
  // Trend factors
  let healthTrend = 0; // Gradual health improvement/degradation
  let lastHealthScore = baseHealthScore;
  
  for (let i = 0; i < 100; i++) {
    const timestamp = now - (100 - i) * interval;
    const progress = i / 100; // 0 to 1 over time
    
    // Time-based patterns
    const timeOfDay = new Date(timestamp).getHours();
    const isBusinessHours = timeOfDay >= 9 && timeOfDay <= 17;
    const loadMultiplier = isBusinessHours ? 1.2 : 0.8;
    
    // Smooth daily cycle (not random jumps)
    const dailyCycle = Math.sin((timeOfDay / 24) * 2 * Math.PI) * 5;
    
    // CPU with smooth variations
    const cpuVariation = Math.sin(progress * Math.PI * 3) * 10; // Smooth waves
    const cpuNoise = (Math.random() - 0.5) * 3; // Small noise
    const cpu = Math.max(5, Math.min(95, baseCpu + cpuVariation + dailyCycle + cpuNoise));
    
    // Memory with gradual changes and occasional GC
    if (i > 0 && Math.random() < 0.08) { // Garbage collection every ~12 points
      baseMemory *= 0.85; // Reduce memory
    } else {
      baseMemory += (Math.random() - 0.4) * 2 * loadMultiplier; // Gradual growth
    }
    const memory = Math.max(20, Math.min(500, baseMemory)) * 1024 * 1024;
    
    // Occasional restarts (very rare)
    if (i > 0 && Math.random() < 0.005) {
      restarts++;
      uptime = (i * interval) / 1000; // Reset uptime from this point
      healthTrend -= 10; // Health drops after restart
    }
    
    // Response time based on load
    const responseTime = 45 + (cpu / 100) * 80 + (Math.random() - 0.5) * 20;
    const errorRate = Math.max(0, (cpu - 70) / 30 + Math.random() * 0.5);
    const throughput = (200 - cpu) * loadMultiplier + (Math.random() - 0.5) * 50;
    
    // Status - mostly online, rare downtimes
    const status = (Math.random() < 0.998 && i > 0) ? 'online' : (i === 0 ? 'online' : 'stopped');
    
    // Calculate health score with smooth transitions
    let healthScore = baseHealthScore;
    
    // Apply trend (gradual improvement or degradation)
    healthScore += healthTrend * progress;
    
    // Apply load-based adjustments
    if (cpu > 80) healthScore -= (cpu - 80) / 2;
    if (cpu > 60) healthScore -= (cpu - 60) / 4;
    
    const memoryGB = memory / (1024 * 1024 * 1024);
    if (memoryGB > 0.5) healthScore -= (memoryGB - 0.5) * 10;
    
    if (responseTime > 100) healthScore -= (responseTime - 100) / 10;
    if (errorRate > 1) healthScore -= errorRate * 5;
    if (status !== 'online') healthScore = 25;
    
    // Smooth health transitions (no sudden jumps)
    if (i > 0) {
      const maxChange = 3; // Maximum change per interval
      const targetChange = healthScore - lastHealthScore;
      const actualChange = Math.max(-maxChange, Math.min(maxChange, targetChange));
      healthScore = lastHealthScore + actualChange;
    }
    
    // Clamp health score
    healthScore = Math.max(20, Math.min(100, healthScore));
    lastHealthScore = healthScore;
    
    // Random health trend changes (recovery/degradation)
    if (Math.random() < 0.05) {
      healthTrend += (Math.random() - 0.5) * 4;
      healthTrend = Math.max(-10, Math.min(10, healthTrend));
    }
    
    const metric: HealthMetric = {
      timestamp,
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round(memory),
      uptime: Math.round(uptime),
      restarts,
      status,
      responseTime: Math.round(responseTime * 10) / 10,
      errorRate: Math.round(errorRate * 100) / 100,
      throughput: Math.round(throughput),
      healthScore: Math.round(healthScore * 10) / 10
    };
    
    data.push(metric);
    
    // Update uptime for next iteration
    if (status === 'online') {
      uptime += interval / 1000;
    }
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
    
    let healthHistory: any[];
    let isRealData = true;
    
    if (isVercelOrDemo) {
      // Use mock data in serverless/demo mode
      healthHistory = generateMockHealthHistory(processId, timeRange);
      isRealData = false;
    } else {
      // Try to get real health history
      healthHistory = await loadProcessHealthHistory(processId, timeRange);
      
      // If no historical data exists, collect current metrics and start monitoring
      if (healthHistory.length === 0) {
        console.log(`No historical data for process ${processId}, collecting current metrics...`);
        const currentMetrics = await collectRealHealthMetrics();
        const processMetric = currentMetrics.find(m => m.processId.toString() === processId);
        
        if (processMetric) {
          healthHistory = [processMetric];
          console.log(`Found current process data for ${processId}`);
        } else {
          // Process doesn't exist, fall back to mock data
          healthHistory = generateMockHealthHistory(processId, timeRange);
          isRealData = false;
        }
      }
    }
    
    // Calculate summary statistics
    const summary = {
      avgHealthScore: healthHistory.reduce((sum, h) => sum + h.healthScore, 0) / healthHistory.length || 0,
      avgCpu: healthHistory.reduce((sum, h) => sum + h.cpu, 0) / healthHistory.length || 0,
      avgMemory: healthHistory.reduce((sum, h) => sum + (h.memory || 0), 0) / healthHistory.length || 0,
      totalRestarts: Math.max(...healthHistory.map(h => h.restarts || 0)) || 0,
      uptimePercentage: (healthHistory.filter(h => h.status === 'online').length / healthHistory.length) * 100 || 0,
      peakCpu: Math.max(...healthHistory.map(h => h.cpu || 0)) || 0,
      peakMemory: Math.max(...healthHistory.map(h => h.memory || 0)) || 0,
      dataPoints: healthHistory.length,
      currentHealth: healthHistory[healthHistory.length - 1]?.healthScore || 0,
      healthIssues: healthHistory[healthHistory.length - 1]?.healthIssues || [],
      isHealthy: healthHistory[healthHistory.length - 1]?.isHealthy || false
    };
    
    return NextResponse.json({
      success: true,
      data: {
        processId,
        timeRange,
        history: healthHistory,
        summary,
        generatedAt: Date.now(),
        dataSource: isRealData ? 'real' : 'simulated',
        message: isRealData ? 
          'Real health data from PM2 monitoring' : 
          'Simulated data - deploy to server with PM2 for real metrics'
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