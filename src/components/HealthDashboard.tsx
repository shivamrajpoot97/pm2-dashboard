'use client';

import { useState, useEffect } from 'react';
import { Heart, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Zap, MemoryStick, RefreshCw } from 'lucide-react';
import { formatBytes, formatUptime } from '@/lib/utils';
import { ProfilingChart } from './ProfilingChart';
import { HealthChart } from './HealthChart';

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

interface HealthSummary {
  avgHealthScore: number;
  avgCpu: number;
  avgMemory: number;
  totalRestarts: number;
  uptimePercentage: number;
  avgResponseTime: number;
  avgErrorRate: number;
  peakCpu: number;
  peakMemory: number;
  dataPoints: number;
}

interface HealthDashboardProps {
  processId: number;
  processName: string;
}

export function HealthDashboard({ processId, processName }: HealthDashboardProps) {
  const [healthData, setHealthData] = useState<HealthMetric[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24); // hours
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch health data
  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pm2/health/${processId}?timeRange=${timeRange}&metrics=all`);
      const result = await response.json();

      if (result.success) {
        setHealthData(result.data.history);
        setSummary(result.data.summary);
      } else {
        setError(result.error || 'Failed to fetch health data');
      }
    } catch (err: any) {
      setError('Failed to fetch health data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get health status color and text
  const getHealthStatus = (score: number) => {
    if (score >= 80) return { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'Excellent' };
    if (score >= 60) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'Good' };
    if (score >= 40) return { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'Fair' };
    return { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'Poor' };
  };

  // Get trend indicator
  const getTrend = (current: number, previous: number) => {
    if (current > previous) return { icon: TrendingUp, color: 'text-green-400', text: 'Improving' };
    if (current < previous) return { icon: TrendingDown, color: 'text-red-400', text: 'Declining' };
    return { icon: TrendingUp, color: 'text-gray-400', text: 'Stable' };
  };

  useEffect(() => {
    fetchHealthData();
  }, [processId, timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHealthData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [autoRefresh, processId, timeRange]);

  const currentHealth = healthData[healthData.length - 1];
  const previousHealth = healthData[healthData.length - 2];
  const healthStatus = currentHealth ? getHealthStatus(currentHealth.healthScore) : null;
  const healthTrend = currentHealth && previousHealth ? getTrend(currentHealth.healthScore, previousHealth.healthScore) : null;

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <div className="bg-gray-750 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Heart className="h-6 w-6 text-pink-400" />
            <h3 className="text-lg font-semibold text-white">Application Health Overview</h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Time Range:</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value={1}>Last Hour</option>
                <option value={6}>Last 6 Hours</option>
                <option value={24}>Last 24 Hours</option>
                <option value={72}>Last 3 Days</option>
                <option value={168}>Last Week</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <label className="text-sm text-gray-400">Auto-refresh</label>
            </div>
            <button
              onClick={fetchHealthData}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded text-sm transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {loading && !healthData.length ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            <span className="ml-3 text-gray-400">Loading health data...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 mb-2">Error loading health data</p>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        ) : currentHealth && healthStatus ? (
          <>
            {/* Current Health Score */}
            <div className={`${healthStatus.bg} ${healthStatus.border} border rounded-lg p-6 mb-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`text-4xl font-bold ${healthStatus.color}`}>
                      {currentHealth.healthScore.toFixed(0)}
                    </div>
                    <div>
                      <p className={`text-lg font-medium ${healthStatus.color}`}>{healthStatus.text}</p>
                      <p className="text-gray-400 text-sm">Health Score</p>
                    </div>
                  </div>
                  {healthTrend && (
                    <div className="flex items-center space-x-2">
                      <healthTrend.icon className={`h-4 w-4 ${healthTrend.color}`} />
                      <span className={`text-sm ${healthTrend.color}`}>{healthTrend.text}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{processName}</p>
                  <p className="text-gray-400 text-sm">Process #{processId}</p>
                  <p className="text-gray-400 text-sm">
                    Last updated: {new Date(currentHealth.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-400">{(summary.uptimePercentage || 0).toFixed(1)}%</p>
                  <p className="text-sm text-gray-400">Uptime</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="h-6 w-6 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{(summary.avgCpu || 0).toFixed(1)}%</p>
                  <p className="text-sm text-gray-400">Avg CPU</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <MemoryStick className="h-6 w-6 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-purple-400">{formatBytes(summary.avgMemory || 0)}</p>
                  <p className="text-sm text-gray-400">Avg Memory</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{(summary.avgResponseTime || 0).toFixed(0)}ms</p>
                  <p className="text-sm text-gray-400">Avg Response</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">No health data available</p>
            <p className="text-gray-500 text-sm">Health monitoring will begin once data is collected</p>
          </div>
        )}
      </div>

      {/* Health Score Chart */}
      {healthData.length > 0 && (
        <div className="bg-gray-750 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Health Score Trend</h4>
          <HealthChart 
            data={healthData} 
            type="health" 
            height={300}
            showTrend={true}
          />
        </div>
      )}

      {/* Performance Metrics Charts */}
      {healthData.length > 0 && (
        <div className="space-y-6">
          {/* Response Time Chart */}
          <div className="bg-gray-750 rounded-lg p-6">
            <HealthChart 
              data={healthData.filter(h => h.responseTime)} 
              type="response" 
              height={250}
              showTrend={true}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Usage Chart */}
          <div className="bg-gray-750 rounded-lg p-6">
            <HealthChart 
              data={healthData} 
              type="cpu" 
              height={250}
              showTrend={true}
            />
          </div>

          {/* Memory Usage Chart */}
          <div className="bg-gray-750 rounded-lg p-6">
            <HealthChart 
              data={healthData} 
              type="memory" 
              height={250}
              showTrend={true}
            />
          </div>
          </div>
        </div>
      )}

      {/* Detailed Statistics */}
      {summary && (
        <div className="bg-gray-750 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Detailed Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Peak CPU</p>
              <p className="text-xl font-bold text-red-400">{(summary.peakCpu || 0).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Peak Memory</p>
              <p className="text-xl font-bold text-red-400">{formatBytes(summary.peakMemory || 0)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Restarts</p>
              <p className="text-xl font-bold text-orange-400">{summary.totalRestarts || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Error Rate</p>
              <p className="text-xl font-bold text-yellow-400">{(summary.avgErrorRate || 0).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Data Points</p>
              <p className="text-xl font-bold text-blue-400">{summary.dataPoints || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}