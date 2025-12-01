import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Health data storage
const HEALTH_DIR = path.join(process.cwd(), '.pm2-health');
const HEALTH_FILE = (processId: string) => path.join(HEALTH_DIR, `health-${processId}.json`);
const SYSTEM_HEALTH_FILE = path.join(HEALTH_DIR, 'system-health.json');

interface RealHealthMetric {
  timestamp: number;
  processId: number;
  name: string;
  // PM2 Metrics
  cpu: number;
  memory: number;
  pid: number;
  uptime: number;
  restarts: number;
  status: string;
  // Calculated Metrics
  memoryMB: number;
  uptimeFormatted: string;
  // Health Indicators
  isHealthy: boolean;
  healthScore: number;
  healthIssues: string[];
  // System Context
  systemLoad: number[];
  totalSystemMemory: number;
  freeSystemMemory: number;
}

// Ensure health directory exists
export async function ensureHealthDir() {
  if (!existsSync(HEALTH_DIR)) {
    await mkdir(HEALTH_DIR, { recursive: true });
  }
}

// Calculate health score based on real metrics
function calculateRealHealthScore(metric: RealHealthMetric): { score: number; issues: string[] } {
  let score = 100;
  const issues: string[] = [];

  // CPU Health (0-40% = good, 40-70% = fair, 70%+ = poor)
  if (metric.cpu > 90) {
    score -= 40;
    issues.push('Critical CPU usage (>90%)');
  } else if (metric.cpu > 70) {
    score -= 25;
    issues.push('High CPU usage (>70%)');
  } else if (metric.cpu > 40) {
    score -= 10;
    issues.push('Elevated CPU usage (>40%)');
  }

  // Memory Health (based on actual memory consumption)
  const memoryMB = metric.memory / (1024 * 1024);
  if (memoryMB > 1024) { // > 1GB
    score -= 30;
    issues.push(`High memory usage (${memoryMB.toFixed(0)}MB)`);
  } else if (memoryMB > 512) { // > 512MB
    score -= 15;
    issues.push(`Elevated memory usage (${memoryMB.toFixed(0)}MB)`);
  }

  // Status Health
  if (metric.status !== 'online') {
    score -= 60;
    issues.push(`Process ${metric.status}`);
  }

  // Restart Health (frequent restarts indicate instability)
  if (metric.restarts > 10) {
    score -= 20;
    issues.push(`Frequent restarts (${metric.restarts})`);
  } else if (metric.restarts > 5) {
    score -= 10;
    issues.push(`Multiple restarts (${metric.restarts})`);
  }

  // System Resource Pressure
  const systemMemoryUsage = ((metric.totalSystemMemory - metric.freeSystemMemory) / metric.totalSystemMemory) * 100;
  if (systemMemoryUsage > 90) {
    score -= 15;
    issues.push('System memory pressure (>90%)');
  }

  const avgLoad = metric.systemLoad[0] || 0;
  if (avgLoad > 4) {
    score -= 15;
    issues.push(`High system load (${avgLoad.toFixed(2)})`);
  }

  // Uptime Health (very low uptime might indicate crashes)
  if (metric.uptime < 60 && metric.restarts > 0) {
    score -= 20;
    issues.push('Recently restarted (potential crash)');
  }

  return { 
    score: Math.max(0, Math.min(100, score)), 
    issues 
  };
}

// Collect real health metrics from PM2
export async function collectRealHealthMetrics(): Promise<RealHealthMetric[]> {
  try {
    // Get PM2 process list
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout || '[]');

    // Get system info
    const os = await import('os');
    const systemLoad = os.loadavg();
    const totalSystemMemory = os.totalmem();
    const freeSystemMemory = os.freemem();

    const metrics: RealHealthMetric[] = [];

    for (const proc of processes) {
      const uptime = proc.pm2_env?.pm_uptime 
        ? Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000)
        : 0;

      const metric: RealHealthMetric = {
        timestamp: Date.now(),
        processId: proc.pm_id,
        name: proc.name,
        cpu: proc.monit?.cpu || 0,
        memory: proc.monit?.memory || 0,
        pid: proc.pid || 0,
        uptime,
        restarts: proc.pm2_env?.restart_time || 0,
        status: proc.pm2_env?.status || 'unknown',
        memoryMB: (proc.monit?.memory || 0) / (1024 * 1024),
        uptimeFormatted: formatUptime(uptime),
        isHealthy: false,
        healthScore: 0,
        healthIssues: [],
        systemLoad,
        totalSystemMemory,
        freeSystemMemory
      };

      const healthResult = calculateRealHealthScore(metric);
      metric.healthScore = healthResult.score;
      metric.healthIssues = healthResult.issues;
      metric.isHealthy = metric.healthScore >= 70 && metric.status === 'online';

      metrics.push(metric);
    }

    return metrics;
  } catch (error) {
    console.error('Failed to collect real health metrics:', error);
    return [];
  }
}

// Save health metrics to persistent storage
export async function saveHealthMetrics(metrics: RealHealthMetric[]) {
  await ensureHealthDir();

  try {
    // Save individual process metrics
    for (const metric of metrics) {
      const processFile = HEALTH_FILE(metric.processId.toString());
      let history: RealHealthMetric[] = [];

      if (existsSync(processFile)) {
        const data = await readFile(processFile, 'utf-8');
        history = JSON.parse(data);
      }

      history.push(metric);

      // Keep last 2000 entries (roughly 2-3 days of 1-minute intervals)
      if (history.length > 2000) {
        history = history.slice(-2000);
      }

      await writeFile(processFile, JSON.stringify(history));
    }

    // Save system-wide summary
    const systemSummary = {
      timestamp: Date.now(),
      totalProcesses: metrics.length,
      healthyProcesses: metrics.filter(m => m.isHealthy).length,
      avgHealthScore: metrics.reduce((sum, m) => sum + m.healthScore, 0) / metrics.length || 0,
      totalCpu: metrics.reduce((sum, m) => sum + m.cpu, 0),
      totalMemory: metrics.reduce((sum, m) => sum + m.memory, 0),
      systemLoad: metrics[0]?.systemLoad || [0, 0, 0],
      systemMemoryUsage: metrics[0] ? 
        ((metrics[0].totalSystemMemory - metrics[0].freeSystemMemory) / metrics[0].totalSystemMemory) * 100 : 0
    };

    let systemHistory = [];
    if (existsSync(SYSTEM_HEALTH_FILE)) {
      const data = await readFile(SYSTEM_HEALTH_FILE, 'utf-8');
      systemHistory = JSON.parse(data);
    }

    systemHistory.push(systemSummary);
    if (systemHistory.length > 2000) {
      systemHistory = systemHistory.slice(-2000);
    }

    await writeFile(SYSTEM_HEALTH_FILE, JSON.stringify(systemHistory));
  } catch (error) {
    console.error('Failed to save health metrics:', error);
  }
}

// Load health history for a specific process
export async function loadProcessHealthHistory(processId: string, hours: number = 24): Promise<RealHealthMetric[]> {
  await ensureHealthDir();

  try {
    const processFile = HEALTH_FILE(processId);
    if (!existsSync(processFile)) {
      return [];
    }

    const data = await readFile(processFile, 'utf-8');
    const history: RealHealthMetric[] = JSON.parse(data);

    // Filter by time range
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return history.filter(h => h.timestamp >= cutoffTime);
  } catch (error) {
    console.error('Failed to load process health history:', error);
    return [];
  }
}

// Load system health history
export async function loadSystemHealthHistory(hours: number = 24) {
  await ensureHealthDir();

  try {
    if (!existsSync(SYSTEM_HEALTH_FILE)) {
      return [];
    }

    const data = await readFile(SYSTEM_HEALTH_FILE, 'utf-8');
    const history = JSON.parse(data);

    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return history.filter((h: any) => h.timestamp >= cutoffTime);
  } catch (error) {
    console.error('Failed to load system health history:', error);
    return [];
  }
}

// Utility function
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Start health monitoring (call this once on server startup)
export async function startHealthMonitoring(intervalMinutes: number = 1) {
  console.log('Starting real health monitoring...');
  
  const collectAndSave = async () => {
    const metrics = await collectRealHealthMetrics();
    if (metrics.length > 0) {
      await saveHealthMetrics(metrics);
      console.log(`Health metrics collected for ${metrics.length} processes`);
    }
  };

  // Collect initial metrics
  await collectAndSave();

  // Set up interval collection
  setInterval(collectAndSave, intervalMinutes * 60 * 1000);
}

// Get current health status
export async function getCurrentHealthStatus() {
  const metrics = await collectRealHealthMetrics();
  return {
    timestamp: Date.now(),
    processes: metrics,
    summary: {
      total: metrics.length,
      healthy: metrics.filter(m => m.isHealthy).length,
      avgHealthScore: metrics.reduce((sum, m) => sum + m.healthScore, 0) / metrics.length || 0,
      criticalIssues: metrics.filter(m => m.healthScore < 50).length
    }
  };
}