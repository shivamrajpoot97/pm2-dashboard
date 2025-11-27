import { ProcessInfo, SystemInfo, PM2Data, ChartDataPoint } from '@/types/pm2';

const processNames = [
  'web-server',
  'api-gateway', 
  'auth-service',
  'database-worker',
  'redis-client',
  'notification-service',
  'file-processor',
  'analytics-engine'
];

const interpreters = ['node', 'python', 'java', 'go'];
const statuses: ProcessInfo['status'][] = ['online', 'stopped', 'errored', 'launching'];

function generateRandomProcess(id: number): ProcessInfo {
  const name = processNames[Math.floor(Math.random() * processNames.length)];
  const status = id < 5 ? 'online' : statuses[Math.floor(Math.random() * statuses.length)];
  const baseMemory = Math.random() * 200 + 50; // 50-250 MB
  const baseCpu = Math.random() * 30; // 0-30%
  
  return {
    pid: 1000 + id,
    name: `${name}-${id}`,
    pm_id: id,
    status,
    restart_time: Math.floor(Math.random() * 10),
    created_at: Date.now() - Math.random() * 86400000 * 30, // Random time in last 30 days
    pm2_env: {
      status,
      instances: 1,
      pm_exec_path: `/app/${name}/index.js`,
      pm_cwd: `/app/${name}`,
      exec_interpreter: interpreters[Math.floor(Math.random() * interpreters.length)],
      pm_out_log_path: `/logs/${name}-out.log`,
      pm_err_log_path: `/logs/${name}-err.log`,
      pm_pid_path: `/var/run/${name}.pid`,
      username: 'pm2',
      merge_logs: true,
      vizion_running: true,
      created_at: Date.now() - Math.random() * 86400000,
      pm_uptime: Date.now() - Math.random() * 86400000,
      unstable_restarts: Math.floor(Math.random() * 5),
      restart_time: Math.floor(Math.random() * 10),
      axm_actions: [],
      axm_monitor: {
        'Loop delay': {
          value: `${(Math.random() * 2).toFixed(2)}ms`,
          type: 'internal',
          unit: 'ms',
          historic: true
        },
        'Used Heap Size': {
          value: `${(baseMemory * 0.8).toFixed(2)} MB`,
          type: 'internal', 
          unit: 'MB',
          historic: true
        },
        'Heap Usage': {
          value: Math.floor(Math.random() * 100),
          type: 'internal',
          unit: '%',
          historic: true
        },
        'Heap Size': {
          value: `${baseMemory.toFixed(2)} MB`,
          type: 'internal',
          unit: 'MB', 
          historic: true
        },
        'Event Loop Latency': {
          value: `${(Math.random() * 5).toFixed(2)}ms`,
          type: 'internal',
          unit: 'ms',
          historic: true
        },
        'Active handles': {
          value: `${Math.floor(Math.random() * 20)}`,
          type: 'internal',
          unit: '',
          historic: true
        },
        'Active requests': {
          value: `${Math.floor(Math.random() * 10)}`,
          type: 'internal', 
          unit: '',
          historic: true
        },
        'HTTP Mean Latency': {
          value: `${(Math.random() * 100).toFixed(2)}ms`,
          type: 'http',
          unit: 'ms',
          historic: true
        },
        'HTTP P95 Latency': {
          value: `${(Math.random() * 300).toFixed(2)}ms`,
          type: 'http',
          unit: 'ms', 
          historic: true
        }
      },
      axm_options: {},
      axm_dynamic: {},
      vizion: true,
      node_version: '18.17.0'
    },
    monit: {
      memory: Math.floor(baseMemory * 1024 * 1024), // Convert to bytes
      cpu: baseCpu
    }
  };
}

function generateSystemInfo(): SystemInfo {
  const totalMem = 16 * 1024 * 1024 * 1024; // 16GB
  const usedMem = Math.random() * 0.7 * totalMem; // Random usage up to 70%
  
  return {
    hostname: 'pm2-server-01',
    uptime: Math.floor(Math.random() * 86400 * 30), // Up to 30 days
    totalmem: totalMem,
    freemem: totalMem - usedMem,
    loadavg: [
      Math.random() * 2,
      Math.random() * 2, 
      Math.random() * 2
    ],
    cpu_count: 8
  };
}

export function generateMockPM2Data(): PM2Data {
  const processCount = 8;
  const processes = Array.from({ length: processCount }, (_, i) => generateRandomProcess(i));
  
  return {
    processes,
    system: generateSystemInfo(),
    timestamp: Date.now()
  };
}

// Export static mock data for Vercel compatibility
export const mockProcesses = Array.from({ length: 8 }, (_, i) => generateRandomProcess(i));
export const mockSystemInfo = generateSystemInfo();

// Generate historical chart data
export function generateChartData(hours: number = 24): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = Date.now();
  const intervalMs = (hours * 60 * 60 * 1000) / 100; // 100 data points
  
  for (let i = 0; i < 100; i++) {
    const timestamp = now - (99 - i) * intervalMs;
    const time = new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    data.push({
      time,
      memory: Math.random() * 80 + 20, // 20-100%
      cpu: Math.random() * 60 + 10, // 10-70%
      timestamp
    });
  }
  
  return data;
}

// Simulate real-time updates
export function updateMockData(currentData: PM2Data): PM2Data {
  const updatedProcesses = currentData.processes.map(process => ({
    ...process,
    monit: {
      memory: Math.max(0, process.monit.memory + (Math.random() - 0.5) * 10 * 1024 * 1024),
      cpu: Math.max(0, Math.min(100, process.monit.cpu + (Math.random() - 0.5) * 10))
    }
  }));
  
  return {
    ...currentData,
    processes: updatedProcesses,
    timestamp: Date.now()
  };
}