'use client';

import { useState, useEffect } from 'react';
import { useAuthFetch } from '@/lib/useAuth';
import { Activity, Heart, AlertTriangle, CheckCircle, Play, RefreshCw } from 'lucide-react';

interface HealthMetric {
  processId: number;
  name: string;
  healthScore: number;
  isHealthy: boolean;
  cpu: number;
  memoryMB: number;
  status: string;
  uptime: number;
  restarts: number;
  healthIssues: string[];
}

interface HealthStatus {
  timestamp: number;
  processes: HealthMetric[];
  summary: {
    total: number;
    healthy: number;
    avgHealthScore: number;
    criticalIssues: number;
  };
  dataSource: 'real' | 'simulated';
}

interface HealthMonitorProps {
  processes?: any[];
}

export default function HealthMonitor({ processes }: HealthMonitorProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const authFetch = useAuthFetch();

  // Calculate real health score based on actual process metrics
  const calculateHealthScore = (process: any): { score: number; issues: string[] } => {
    let score = 100;
    const issues: string[] = [];

    // CPU Health
    if (process.monit?.cpu > 90) {
      score -= 40;
      issues.push(`Critical CPU usage (${process.monit.cpu.toFixed(1)}%)`);
    } else if (process.monit?.cpu > 70) {
      score -= 25;
      issues.push(`High CPU usage (${process.monit.cpu.toFixed(1)}%)`);
    } else if (process.monit?.cpu > 40) {
      score -= 10;
      issues.push(`Elevated CPU usage (${process.monit.cpu.toFixed(1)}%)`);
    }

    // Memory Health
    const memoryMB = (process.monit?.memory || 0) / (1024 * 1024);
    if (memoryMB > 1024) {
      score -= 30;
      issues.push(`High memory usage (${memoryMB.toFixed(0)}MB)`);
    } else if (memoryMB > 512) {
      score -= 15;
      issues.push(`Elevated memory usage (${memoryMB.toFixed(0)}MB)`);
    }

    // Status Health
    if (process.pm2_env?.status !== 'online') {
      score -= 60;
      issues.push(`Process ${process.pm2_env?.status || 'unknown'}`);
    }

    // Restart Health
    const restarts = process.pm2_env?.restart_time || 0;
    if (restarts > 10) {
      score -= 20;
      issues.push(`Frequent restarts (${restarts})`);
    } else if (restarts > 5) {
      score -= 10;
      issues.push(`Multiple restarts (${restarts})`);
    }

    // Recent restart penalty
    const uptime = process.pm2_env?.pm_uptime ? (Date.now() - process.pm2_env.pm_uptime) / 1000 : 0;
    if (uptime < 60 && restarts > 0) {
      score -= 20;
      issues.push('Recently restarted (potential crash)');
    }

    return { 
      score: Math.max(0, Math.min(100, score)), 
      issues 
    };
  };

  const processRealHealthData = () => {
    if (!processes || processes.length === 0) {
      setHealthStatus(null);
      setLoading(false);
      return;
    }

    const healthMetrics: HealthMetric[] = processes.map(process => {
      const healthResult = calculateHealthScore(process);
      const uptime = process.pm2_env?.pm_uptime 
        ? Math.floor((Date.now() - process.pm2_env.pm_uptime) / 1000)
        : 0;

      return {
        processId: process.pm_id,
        name: process.name,
        healthScore: healthResult.score,
        isHealthy: healthResult.score >= 70 && process.pm2_env?.status === 'online',
        cpu: process.monit?.cpu || 0,
        memoryMB: (process.monit?.memory || 0) / (1024 * 1024),
        status: process.pm2_env?.status || 'unknown',
        uptime,
        restarts: process.pm2_env?.restart_time || 0,
        healthIssues: healthResult.issues
      };
    });

    const summary = {
      total: healthMetrics.length,
      healthy: healthMetrics.filter(m => m.isHealthy).length,
      avgHealthScore: healthMetrics.reduce((sum, m) => sum + m.healthScore, 0) / healthMetrics.length || 0,
      criticalIssues: healthMetrics.filter(m => m.healthScore < 50).length
    };

    setHealthStatus({
      timestamp: Date.now(),
      processes: healthMetrics,
      summary,
      dataSource: 'real'
    });
    setLoading(false);
  };

  const fetchHealthStatus = async () => {
    if (processes) {
      // Use real process data
      processRealHealthData();
    } else {
      // Fallback to API
      try {
        const response = await authFetch('/api/pm2/health/status');
        const result = await response.json();
        
        if (result.success) {
          setHealthStatus(result.data);
        } else {
          console.error('Failed to fetch health status:', result.error);
        }
      } catch (error) {
        console.error('Error fetching health status:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const startMonitoring = async () => {
    setMonitoring(true);
    try {
      const response = await authFetch('/api/pm2/health/status?action=start-monitoring');
      const result = await response.json();
      
      if (result.success) {
        console.log('Health monitoring started:', result.message);
        await fetchHealthStatus();
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    } finally {
      setMonitoring(false);
    }
  };

  const collectMetrics = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/pm2/health/status', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        console.log('Metrics collected:', result.message);
        await fetchHealthStatus();
      }
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-blue-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getHealthBg = (score: number) => {
    if (score >= 90) return 'bg-green-500/20 border-green-500/30';
    if (score >= 80) return 'bg-blue-500/20 border-blue-500/30';
    if (score >= 70) return 'bg-yellow-500/20 border-yellow-500/30';
    if (score >= 50) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  useEffect(() => {
    fetchHealthStatus();
  }, [processes]);

  useEffect(() => {
    if (autoRefresh && !processes) {
      const interval = setInterval(fetchHealthStatus, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, processes]);

  if (loading && !healthStatus) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-center">
          <Activity className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading health status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Heart className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Health Monitoring</h2>
            <p className="text-sm text-gray-500">
              {healthStatus?.dataSource === 'real' ? 'Real PM2 Data' : 'Simulated Data'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded transition-colors text-sm ${
              autoRefresh 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Auto Refresh
          </button>
          
          {healthStatus?.dataSource === 'real' && (
            <button
              onClick={startMonitoring}
              disabled={monitoring}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              <Play className="w-4 h-4" />
              <span>{monitoring ? 'Starting...' : 'Start Monitoring'}</span>
            </button>
          )}
          
          <button
            onClick={collectMetrics}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Collect Now</span>
          </button>
        </div>
      </div>

      {healthStatus && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Healthy Processes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {healthStatus.summary.healthy}/{healthStatus.summary.total}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <Heart className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-500">Average Health</p>
                  <p className={`text-xl font-bold ${getHealthColor(healthStatus.summary.avgHealthScore).replace('text-', 'text-').replace('-400', '-600')}`}>
                    {healthStatus.summary.avgHealthScore.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-500">Critical Issues</p>
                  <p className="text-xl font-bold text-gray-900">
                    {healthStatus.summary.criticalIssues}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <Activity className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Last Update</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(healthStatus.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Process Health Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {healthStatus.processes.map((process) => (
              <div
                key={process.processId}
                className={`rounded-lg p-4 border ${getHealthBg(process.healthScore).replace('bg-', 'bg-').replace('border-', 'border-').replace('-500/20', '-100').replace('-500/30', '-200')}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      process.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <h3 className="text-lg font-semibold text-gray-900">{process.name}</h3>
                  </div>
                  <span className={`text-2xl font-bold ${getHealthColor(process.healthScore).replace('text-', 'text-').replace('-400', '-600')}`}>
                    {process.healthScore.toFixed(1)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">CPU:</span>
                    <span className="text-gray-900 ml-2 font-medium">{process.cpu.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Memory:</span>
                    <span className="text-gray-900 ml-2 font-medium">{process.memoryMB.toFixed(1)}MB</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Uptime:</span>
                    <span className="text-gray-900 ml-2 font-medium">{formatUptime(process.uptime)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Restarts:</span>
                    <span className="text-gray-900 ml-2 font-medium">{process.restarts}</span>
                  </div>
                </div>
                
                {process.healthIssues.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Health Issues:</p>
                    <div className="space-y-1">
                      {process.healthIssues.map((issue, idx) => (
                        <p key={idx} className="text-xs text-yellow-600 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {issue}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}