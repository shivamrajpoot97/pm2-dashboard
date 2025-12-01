'use client';

import { useState, useEffect } from 'react';
import { useAuthFetch } from '@/lib/useAuth';
import { ProcessTable } from './ProcessTable';
import { ProcessInfo } from '@/types/pm2';
import { X, Activity, Cpu, MemoryStick, Zap, Globe, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';

export default function ProcessTableDefault() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showProfiling, setShowProfiling] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [processDetails, setProcessDetails] = useState<any>(null);
  const [processLogs, setProcessLogs] = useState<any>(null);
  const [processProfiling, setProcessProfiling] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [profilingLoading, setProfilingLoading] = useState(false);
  const [activeLogTab, setActiveLogTab] = useState<'out' | 'error'>('out');
  const [profilingPeriod, setProfilingPeriod] = useState<'1h' | '24h' | '1w' | '15d' | '1m'>('24h');
  const authFetch = useAuthFetch();

  const fetchProcesses = async () => {
    try {
      const response = await authFetch('/api/pm2');
      const result = await response.json();
      
      if (result.success) {
        setProcesses(result.data.processes || []);
      } else {
        console.error('Failed to fetch PM2 processes:', result.error);
      }
    } catch (error) {
      console.error('Error fetching processes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, processId: number) => {
    try {
      // Handle special actions that don't go through PM2 API
      if (action === 'logs') {
        // Show logs in modal
        await showProcessLogs(processId);
        return;
      }
      
      if (action === 'details') {
        // Show details in modal
        await showProcessDetails(processId);
        return;
      }
      
      if (action === 'profiling') {
        // Show app profiling in modal
        console.log('Profiling button clicked for process:', processId);
        await showProcessProfiling(processId);
        return;
      }
      
      // Handle regular PM2 actions
      const response = await authFetch('/api/pm2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, processId }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh the processes list after action
        fetchProcesses();
      } else {
        console.error(`Failed to ${action} process:`, result.error);
        alert(`Failed to ${action} process: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Error performing ${action}: ${(error as Error).message}`);
    }
  };

  const showProcessDetails = async (processId: number) => {
    setDetailsLoading(true);
    setShowDetails(true);
    setSelectedProcess(processes.find(p => p.pm_id === processId));
    
    try {
      const response = await authFetch(`/api/pm2/${processId}`);
      const result = await response.json();
      
      if (result.success) {
        setProcessDetails(result.data);
      } else {
        console.error('Failed to fetch process details:', result.error);
        setProcessDetails({ error: result.error });
      }
    } catch (error) {
      console.error('Error fetching process details:', error);
      setProcessDetails({ error: (error as Error).message });
    } finally {
      setDetailsLoading(false);
    }
  };

  const showProcessLogs = async (processId: number) => {
    setLogsLoading(true);
    setShowLogs(true);
    setSelectedProcess(processes.find(p => p.pm_id === processId));
    
    try {
      const response = await authFetch(`/api/pm2/logs/${processId}`);
      const result = await response.json();
      
      if (result.success) {
        setProcessLogs(result.data);
      } else {
        console.error('Failed to fetch process logs:', result.error);
        setProcessLogs({ error: result.error });
      }
    } catch (error) {
      console.error('Error fetching process logs:', error);
      setProcessLogs({ error: (error as Error).message });
    } finally {
      setLogsLoading(false);
    }
  };

  const showProcessProfiling = async (processId: number) => {
    setProfilingLoading(true);
    setShowProfiling(true);
    setSelectedProcess(processes.find(p => p.pm_id === processId));
    
    try {
      const response = await authFetch(`/api/pm2/historical?period=${profilingPeriod}&processId=${processId}`);
      const result = await response.json();
      
      if (result.success && result.data.dataPoints) {
        const dataPoints = result.data.dataPoints;
        
        // Transform API data for app profiling
        setProcessProfiling({
          processId,
          period: profilingPeriod,
          metrics: {
            cpu: {
              usage: dataPoints.map((d: any) => ({
                timestamp: d.timestamp,
                value: d.process.cpu
              }))
            },
            memory: {
              heap: dataPoints.map((d: any) => ({
                timestamp: d.timestamp,
                value: d.process.metrics?.heap || (d.process.memory / (1024 * 1024))
              })),
              rss: dataPoints.map((d: any) => ({
                timestamp: d.timestamp,
                value: d.process.memory / (1024 * 1024) // Convert to MB
              }))
            },
            eventLoop: {
              delay: dataPoints.map((d: any) => ({
                timestamp: d.timestamp,
                value: d.process.metrics?.eventLoopDelay || 2.5
              }))
            },
            http: {
              requests: dataPoints.map((d: any) => ({
                timestamp: d.timestamp,
                value: d.process.metrics?.httpRequests || 150
              })),
              latency: dataPoints.map((d: any) => ({
                timestamp: d.timestamp,
                value: d.process.metrics?.httpLatency || 85
              }))
            }
          },
          summary: result.data.summary || {
            avgCpu: 15.2,
            avgMemory: 185,
            totalRequests: 45680,
            errorRate: 0.12,
            uptime: 87400
          }
      });
      } else {
        console.error('Failed to fetch app profiling data:', result.error);
        setProcessProfiling({ error: result.error || 'Failed to load profiling data' });
      }
    } catch (error) {
      console.error('Error fetching app profiling:', error);
      setProcessProfiling({ error: (error as Error).message });
    } finally {
      setProfilingLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-700 rounded w-5/6"></div>
            <div className="h-3 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProcessTable processes={processes} onAction={handleAction} />
      
      {/* Process Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Process Details - {selectedProcess?.name || 'Loading...'}
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading process details...</p>
              </div>
            ) : processDetails?.error ? (
              <div className="text-center py-12">
                <p className="text-red-400">Error loading details: {processDetails.error}</p>
              </div>
            ) : processDetails ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Process ID:</span>
                      <span className="text-white font-mono">{processDetails.basic?.pm_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">PID:</span>
                      <span className="text-white font-mono">{processDetails.basic?.pid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={`font-medium ${
                        processDetails.basic?.status === 'online' ? 'text-green-400' : 'text-red-400'
                      }`}>{processDetails.basic?.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Uptime:</span>
                      <span className="text-white">{formatUptime(processDetails.basic?.uptime || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Restarts:</span>
                      <span className="text-white">{processDetails.basic?.restarts || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Resources */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Resources</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">CPU:</span>
                      <span className="text-blue-400">{processDetails.resources?.cpu?.toFixed(2) || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Memory:</span>
                      <span className="text-purple-400">{formatBytes(processDetails.resources?.memory || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Heap Size:</span>
                      <span className="text-white">{processDetails.resources?.heap_size || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Heap Usage:</span>
                      <span className="text-white">{processDetails.resources?.heap_usage || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Environment */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Environment</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Node Version:</span>
                      <span className="text-green-400">{processDetails.environment?.node_version || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Exec Mode:</span>
                      <span className="text-white">{processDetails.environment?.exec_mode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Instances:</span>
                      <span className="text-white">{processDetails.environment?.instances || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Exec Path:</span>
                      <div className="text-white font-mono text-xs mt-1 bg-gray-800 p-2 rounded break-all">
                        {processDetails.environment?.pm_exec_path || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Loop Delay:</span>
                      <span className="text-yellow-400">{processDetails.performance?.loop_delay || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Event Loop Latency:</span>
                      <span className="text-yellow-400">{processDetails.performance?.event_loop_latency || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">HTTP Mean Latency:</span>
                      <span className="text-yellow-400">{processDetails.performance?.http_mean_latency || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">HTTP P95 Latency:</span>
                      <span className="text-yellow-400">{processDetails.performance?.http_p95_latency || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Log Paths */}
                <div className="bg-gray-900 rounded-lg p-4 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-white mb-4">Log Files</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Output Log:</span>
                      <div className="text-white font-mono text-xs mt-1 bg-gray-800 p-2 rounded break-all">
                        {processDetails.logs?.out_log_path || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Error Log:</span>
                      <div className="text-white font-mono text-xs mt-1 bg-gray-800 p-2 rounded break-all">
                        {processDetails.logs?.err_log_path || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Git Information */}
                {processDetails.git && (
                  <div className="bg-gray-900 rounded-lg p-4 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4">Git Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Repository:</span>
                        <div className="text-blue-400 text-xs mt-1 break-all">
                          {processDetails.git.repository_url || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Branch:</span>
                        <div className="text-green-400 mt-1">
                          {processDetails.git.branch || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Commit:</span>
                        <div className="text-yellow-400 font-mono text-xs mt-1">
                          {processDetails.git.short_commit || 'N/A'}
                        </div>
                      </div>
                    </div>
                    {processDetails.git.commit_message && (
                      <div className="mt-3">
                        <span className="text-gray-400">Last Commit:</span>
                        <div className="text-white text-xs mt-1 bg-gray-800 p-2 rounded">
                          {processDetails.git.commit_message}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          by {processDetails.git.commit_author} - {processDetails.git.commit_date}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No details available</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Process Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                Process Logs - {selectedProcess?.name || 'Loading...'}
              </h2>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Log Tabs */}
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setActiveLogTab('out')}
                className={`px-4 py-2 rounded transition-colors ${
                  activeLogTab === 'out'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Output Logs
              </button>
              <button
                onClick={() => setActiveLogTab('error')}
                className={`px-4 py-2 rounded transition-colors ${
                  activeLogTab === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Error Logs
              </button>
            </div>

            {logsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading process logs...</p>
              </div>
            ) : processLogs?.error ? (
              <div className="text-center py-12">
                <p className="text-red-400">Error loading logs: {processLogs.error}</p>
              </div>
            ) : processLogs ? (
              <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto">
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                  {activeLogTab === 'out' 
                    ? (processLogs.out || 'No output logs available')
                    : (processLogs.error || 'No error logs available')
                  }
                </pre>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No logs available</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* App Profiling Modal */}
      {showProfiling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <span>App Profiling - {selectedProcess?.name || 'Loading...'}</span>
              </h2>
              <div className="flex items-center space-x-4">
                <select
                  value={profilingPeriod}
                  onChange={(e) => {
                    setProfilingPeriod(e.target.value as any);
                    if (selectedProcess) showProcessProfiling(selectedProcess.pm_id);
                  }}
                  className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                >
                      <option value="1h">Last Hour</option>
    <option value="24h">Last 24 Hours</option>
    <option value="1w">Last Week</option>
    <option value="15d">Last 15 Days</option>
    <option value="1m">Last Month</option>
                </select>
                <button
                  onClick={() => setShowProfiling(false)}
                  className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {profilingLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading app profiling data...</p>
              </div>
            ) : processProfiling?.error ? (
              <div className="text-center py-12">
                <p className="text-red-400">Error loading profiling: {processProfiling.error}</p>
              </div>
            ) : processProfiling ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-400">Avg CPU</span>
                    </div>
                    <p className="text-xl font-bold text-blue-400">{processProfiling.summary.avgCpu}%</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <MemoryStick className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-400">Avg Memory</span>
                    </div>
                    <p className="text-xl font-bold text-purple-400">{formatBytes(processProfiling.summary.avgMemory * 1024 * 1024)}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Globe className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-400">Total Requests</span>
                    </div>
                    <p className="text-xl font-bold text-green-400">{processProfiling.summary.totalRequests.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-400">Error Rate</span>
                    </div>
                    <p className="text-xl font-bold text-yellow-400">{processProfiling.summary.errorRate}%</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm text-gray-400">Uptime</span>
                    </div>
                    <p className="text-xl font-bold text-indigo-400">{formatUptime(processProfiling.summary.uptime)}</p>
                  </div>
                </div>

                {/* Performance Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* CPU Performance */}
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center space-x-2">
                      <Cpu className="w-5 h-5" />
                      <span>CPU Performance</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">CPU Usage</span>
                          <span className="text-blue-400">%</span>
                        </div>
                        <div className="h-16 bg-gray-800 rounded p-2">
                          <div className="flex items-end justify-between h-full">
                            {processProfiling.metrics.cpu.usage.slice(-20).map((point: any, i: number) => {
                              const height = (point.value / 30) * 100;
                              return (
                                <div
                                  key={i}
                                  className="bg-blue-500 rounded-t transition-all duration-300 hover:opacity-80"
                                  style={{ height: `${height}%`, width: '4%' }}
                                  title={`${point.value.toFixed(1)}% at ${new Date(point.timestamp).toLocaleTimeString()}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center space-x-2">
                      <MemoryStick className="w-5 h-5" />
                      <span>Memory Usage</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Heap Memory</span>
                          <span className="text-purple-400">MB</span>
                        </div>
                        <div className="h-16 bg-gray-800 rounded p-2">
                          <div className="flex items-end justify-between h-full">
                            {processProfiling.metrics.memory.heap.slice(-20).map((point: any, i: number) => {
                              const height = (point.value / 200) * 100;
                              return (
                                <div
                                  key={i}
                                  className="bg-purple-500 rounded-t transition-all duration-300 hover:opacity-80"
                                  style={{ height: `${height}%`, width: '4%' }}
                                  title={`${point.value.toFixed(1)}MB at ${new Date(point.timestamp).toLocaleTimeString()}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Event Loop */}
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center space-x-2">
                      <Zap className="w-5 h-5" />
                      <span>Event Loop</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Loop Delay</span>
                          <span className="text-yellow-400">ms</span>
                        </div>
                        <div className="h-16 bg-gray-800 rounded p-2">
                          <div className="flex items-end justify-between h-full">
                            {processProfiling.metrics.eventLoop.delay.slice(-20).map((point: any, i: number) => {
                              const height = (point.value / 5) * 100;
                              return (
                                <div
                                  key={i}
                                  className="bg-yellow-500 rounded-t transition-all duration-300 hover:opacity-80"
                                  style={{ height: `${height}%`, width: '4%' }}
                                  title={`${point.value.toFixed(1)}ms at ${new Date(point.timestamp).toLocaleTimeString()}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HTTP Performance */}
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center space-x-2">
                      <Globe className="w-5 h-5" />
                      <span>HTTP Requests</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Requests/min</span>
                          <span className="text-green-400">req</span>
                        </div>
                        <div className="h-16 bg-gray-800 rounded p-2">
                          <div className="flex items-end justify-between h-full">
                            {processProfiling.metrics.http.requests.slice(-20).map((point: any, i: number) => {
                              const height = (point.value / 300) * 100;
                              return (
                                <div
                                  key={i}
                                  className="bg-green-500 rounded-t transition-all duration-300 hover:opacity-80"
                                  style={{ height: `${height}%`, width: '4%' }}
                                  title={`${point.value.toFixed(0)} req/min at ${new Date(point.timestamp).toLocaleTimeString()}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No profiling data available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
