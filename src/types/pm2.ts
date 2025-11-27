export interface ProcessInfo {
  pid: number;
  name: string;
  pm_id: number;
  status: 'online' | 'stopped' | 'stopping' | 'waiting restart' | 'launching' | 'errored' | 'one-launch-status';
  restart_time: number;
  created_at: number;
  pm2_env: {
    status: string;
    instances: number;
    pm_exec_path: string;
    pm_cwd: string;
    exec_interpreter: string;
    pm_out_log_path: string;
    pm_err_log_path: string;
    pm_pid_path: string;
    username: string;
    merge_logs: boolean;
    vizion_running: boolean;
    created_at: number;
    pm_uptime: number;
    unstable_restarts: number;
    restart_time: number;
    axm_actions: any[];
    axm_monitor: {
      'Loop delay': {
        value: string;
        type: string;
        unit: string;
        historic: boolean;
      };
      'Used Heap Size': {
        value: string;
        type: string;
        unit: string;
        historic: boolean;
      };
      'Heap Usage': {
        value: number;
        type: string;
        unit: string;
        historic: boolean;
      };
      'Heap Size': {
        value: string;
        type: string;
        unit: string;
        historic: boolean;
      };
      'Event Loop Latency': {
        value: string;
        type: string;
        unit: string;
        historic: boolean;
      };
      'Active handles': {
        value: string;
        type: string;
        unit: string;
        historic: boolean;
      };
      'Active requests': {
        value: string;
        type: string;
        unit: string;
        historic: boolean;
      };
      'HTTP Mean Latency': {
        value: string;
        type: string;
        unit: string;
        historic: boolean;
      };
      'HTTP P95 Latency': {
        value: string;
        type: string;
        unit: string;
        historic: boolean;
      };
    };
    axm_options: any;
    axm_dynamic: any;
    vizion: boolean;
    node_version: string;
  };
  monit: {
    memory: number;
    cpu: number;
  };
}

export interface SystemInfo {
  hostname: string;
  uptime: number;
  totalmem: number;
  freemem: number;
  loadavg: number[];
  cpu_count: number;
}

export interface PM2Data {
  processes: ProcessInfo[];
  system: SystemInfo;
  timestamp: number;
}

export interface ChartDataPoint {
  time: string;
  memory: number;
  cpu: number;
  timestamp: number;
}