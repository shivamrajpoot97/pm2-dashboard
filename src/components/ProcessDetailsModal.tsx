'use client';

import { useState, useEffect } from 'react';
import { X, Activity, Settings, Database, Clock, Cpu, MemoryStick, Zap, FileText, AlertCircle, CheckCircle, XCircle, GitBranch, TrendingUp, Heart } from 'lucide-react';
import { ProcessProfiling } from './ProcessProfiling';
import { HealthDashboard } from './HealthDashboard';
import { formatBytes, formatUptime } from '@/lib/utils';

interface ProcessDetails {
  basic: {
    pid: number;
    name: string;
    pm_id: number;
    status: string;
    uptime: number;
    restarts: number;
    unstable_restarts: number;
  };
  resources: {
    cpu: number;
    memory: number;
    heap_size: string;
    heap_usage: string;
    used_heap_size: string;
    active_handles: string;
    active_requests: string;
  };
  performance: {
    loop_delay: string;
    event_loop_latency: string;
    http_mean_latency: string;
    http_p95_latency: string;
  };
  environment: {
    node_version: string;
    exec_interpreter: string;
    exec_mode: string;
    instances: number;
    pm_exec_path: string;
    pm_cwd: string;
    args: string[];
    env: Record<string, any>;
  };
  logs: {
    out_log_path: string;
    err_log_path: string;
    pid_path: string;
    merge_logs: boolean;
  };
  timestamps: {
    created_at: number;
    pm_uptime: number;
    last_restart: number;
  };
  monitoring: Record<string, any>;
  git: {
    repository_url: string;
    branch: string;
    commit: string;
    short_commit: string;
    commit_message: string;
    commit_author: string;
    commit_email: string;
    commit_date: string;
  };
}

interface ProcessDetailsModalProps {
  processId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, processId: number) => void;
}

export function ProcessDetailsModal({ processId, isOpen, onClose, onAction }: ProcessDetailsModalProps) {
  const [details, setDetails] = useState<ProcessDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && processId !== null) {
      fetchProcessDetails();
    }
  }, [isOpen, processId]);

  const fetchProcessDetails = async () => {
    if (processId === null) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/pm2/${processId}`);
      const result = await response.json();
      
      if (result.success) {
        setDetails(result.data);
      } else {
        setError(result.error || 'Failed to fetch process details');
      }
    } catch (err: any) {
      setError('Failed to fetch process details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string) => {
    if (processId !== null && onAction) {
      onAction(action, processId);
    }
  };

  const fetchLogs = async () => {
    if (processId === null) return;
    
    setLogsLoading(true);
    setLogsError(null);
    
    try {
      const response = await fetch(`/api/pm2/logs/${processId}?lines=50`);
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data.logs);
      } else {
        setLogsError(result.error || 'Failed to fetch logs');
      }
    } catch (err: any) {
      setLogsError('Failed to fetch logs: ' + err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  const clearLogs = async () => {
    if (processId === null) return;
    
    setLogsLoading(true);
    setLogsError(null);
    
    try {
      const response = await fetch(`/api/pm2/logs/${processId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        setLogs('');
        // Show success message
        alert('Logs cleared successfully!');
      } else {
        setLogsError(result.error || 'Failed to clear logs');
      }
    } catch (err: any) {
      setLogsError('Failed to clear logs: ' + err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Process Details {processId !== null && `#${processId}`}
                </h2>
                <p className="text-gray-400 text-sm">
                  {details?.basic.name || 'Loading...'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {details && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAction('restart')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => handleAction('stop')}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                  >
                    Stop
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[70vh]">
            {/* Sidebar Tabs */}
            <div className="w-64 border-r border-gray-700 p-4">
              <nav className="space-y-2">
                {[
                  { id: 'overview', label: 'Overview', icon: Activity },
                  { id: 'resources', label: 'Resources', icon: Cpu },
                  { id: 'performance', label: 'Performance', icon: Zap },
                  { id: 'environment', label: 'Environment', icon: Settings },
                  { id: 'logs', label: 'Logs & Time', icon: Clock },
                  { id: 'monitoring', label: 'Monitoring', icon: Database },
                  { id: 'git', label: 'Git Info', icon: GitBranch },
                  { id: 'profiling', label: 'Profiling', icon: TrendingUp },
                  { id: 'health', label: 'Health', icon: Heart },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                    <p className="text-red-400 mb-2">Error loading process details</p>
                    <p className="text-gray-400 text-sm">{error}</p>
                  </div>
                </div>
              ) : details ? (
                <div className="space-y-6">
                  {renderTabContent(activeTab, details, { fetchLogs, clearLogs, logs, logsLoading, logsError })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderTabContent(activeTab: string, details: ProcessDetails, logHandlers?: {
  fetchLogs: () => void;
  clearLogs: () => void;
  logs: string;
  logsLoading: boolean;
  logsError: string | null;
}) {
  switch (activeTab) {
    case 'overview':
      return (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                  details.basic.status === 'online' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {details.basic.status === 'online' ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                </div>
                <p className="text-sm font-medium text-white">{details.basic.status}</p>
                <p className="text-xs text-gray-400">Status</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{details.basic.pid}</div>
                <p className="text-xs text-gray-400">PID</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{formatUptime(details.basic.uptime)}</div>
                <p className="text-xs text-gray-400">Uptime</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{details.basic.restarts}</div>
                <p className="text-xs text-gray-400">Restarts</p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Process Name</label>
                <p className="text-white font-medium">{details.basic.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">PM2 ID</label>
                <p className="text-white font-medium">{details.basic.pm_id}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Exec Mode</label>
                <p className="text-white font-medium">{details.environment.exec_mode}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Instances</label>
                <p className="text-white font-medium">{details.environment.instances}</p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'resources':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPU Usage */}
            <div className="bg-gray-750 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Cpu className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">CPU Usage</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{details.resources.cpu.toFixed(1)}%</div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(details.resources.cpu, 100)}%` }}
                />
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-gray-750 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MemoryStick className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Memory Usage</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{formatBytes(details.resources.memory)}</div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((details.resources.memory / (512 * 1024 * 1024)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Additional Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-400">Heap Size</label>
                <p className="text-white font-medium">{details.resources.heap_size}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Heap Usage</label>
                <p className="text-white font-medium">{details.resources.heap_usage}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Active Handles</label>
                <p className="text-white font-medium">{details.resources.active_handles}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Active Requests</label>
                <p className="text-white font-medium">{details.resources.active_requests}</p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'performance':
      return (
        <div className="space-y-6">
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-400">Loop Delay</label>
                <p className="text-2xl font-bold text-white">{details.performance.loop_delay}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Event Loop Latency</label>
                <p className="text-2xl font-bold text-white">{details.performance.event_loop_latency}</p>
              </div>
                            <div>
                <label className="text-sm text-gray-400">HTTP Mean Latency</label>
                <p className="text-2xl font-bold text-white">{details.performance.http_mean_latency}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">HTTP P95 Latency</label>
                <p className="text-2xl font-bold text-white">{details.performance.http_p95_latency}</p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'environment':
      return (
        <div className="space-y-6">
          {/* Runtime Info */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Runtime Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Node Version</label>
                <p className="text-white font-medium">{details.environment.node_version}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Interpreter</label>
                <p className="text-white font-medium">{details.environment.exec_interpreter}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Execution Path</label>
                <p className="text-white font-medium text-sm break-all">{details.environment.pm_exec_path}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Working Directory</label>
                <p className="text-white font-medium text-sm break-all">{details.environment.pm_cwd}</p>
              </div>
            </div>
          </div>

          {/* Arguments */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Arguments</h3>
            <div className="flex flex-wrap gap-2">
              {details.environment.args.length > 0 ? (
                details.environment.args.map((arg, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-600 text-gray-200 text-sm rounded-full"
                  >
                    {arg}
                  </span>
                ))
              ) : (
                <p className="text-gray-400">No arguments</p>
              )}
            </div>
          </div>

          {/* Environment Variables */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Environment Variables</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(details.environment.env).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded">
                  <span className="text-gray-300 font-medium text-sm">{key}</span>
                  <span className="text-gray-400 text-sm font-mono break-all ml-4">
                    {typeof value === 'string' && value.includes('***') ? (
                      <span className="text-red-400">Hidden</span>
                    ) : (
                      String(value)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'logs':
      return (
        <div className="space-y-6">
          {/* Timestamps */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Process Timestamps</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400">Created At</label>
                <p className="text-white font-medium">
                  {new Date(details.timestamps.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Started At</label>
                <p className="text-white font-medium">
                  {new Date(details.timestamps.pm_uptime).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Last Restart</label>
                <p className="text-white font-medium">
                  {details.timestamps.last_restart 
                    ? new Date(details.timestamps.last_restart).toLocaleString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Log Settings */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Log Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Merge Logs</label>
                <p className="text-white font-medium">{details.logs.merge_logs ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Log Management</label>
                <div className="flex space-x-2 mt-1">
                  <button 
                    onClick={logHandlers?.fetchLogs}
                    disabled={logHandlers?.logsLoading}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-xs rounded transition-colors"
                  >
                    {logHandlers?.logsLoading ? 'Loading...' : 'View Logs'}
                  </button>
                  <button 
                    onClick={logHandlers?.clearLogs}
                    disabled={logHandlers?.logsLoading}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white text-xs rounded transition-colors"
                  >
                    Clear Logs
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Log Preview */}
          <div className="bg-gray-750 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Logs (Last 50 lines)</h3>
              <button
                onClick={logHandlers?.fetchLogs}
                disabled={logHandlers?.logsLoading}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white text-xs rounded transition-colors"
              >
                {logHandlers?.logsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            <div className="bg-gray-800 rounded p-4 font-mono text-sm max-h-96 overflow-y-auto">
              {logHandlers?.logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-400">Loading logs...</span>
                </div>
              ) : logHandlers?.logsError ? (
                <div className="text-red-400">
                  <div className="mb-2">Error loading logs:</div>
                  <div className="text-red-300 text-xs">{logHandlers.logsError}</div>
                </div>
              ) : logHandlers?.logs ? (
                <pre className="text-gray-300 whitespace-pre-wrap text-xs leading-relaxed">{logHandlers.logs}</pre>
              ) : (
                <div className="text-gray-400">
                  <div className="mb-2">No logs loaded yet</div>
                  <div className="text-gray-500 text-xs">
                    Click "View Logs" to fetch recent log entries, or use PM2 commands:
                    <br />
                    <code className="text-blue-400">pm2 logs {details.basic.name}</code> - View live logs
                    <br />
                    <code className="text-blue-400">pm2 logs {details.basic.name} --lines 50</code> - View last 50 lines
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 'monitoring':
      return (
        <div className="space-y-6">
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Custom Metrics</h3>
            <div className="space-y-4">
              {Object.entries(details.monitoring).length > 0 ? (
                Object.entries(details.monitoring).map(([key, metric]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between py-3 px-4 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{key}</h4>
                      {metric.type && (
                        <p className="text-gray-400 text-sm">Type: {metric.type}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">
                        {typeof metric === 'object' ? metric.value : metric}
                        {metric.unit && <span className="text-gray-400 text-sm ml-1">{metric.unit}</span>}
                      </p>
                      {metric.historic && (
                        <span className="text-xs text-blue-400">Historic</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No custom metrics available</p>
                  <p className="text-gray-500 text-sm">Add custom metrics using PM2 monitoring</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 'git':
      return (
        <div className="space-y-6">
          {/* Repository Information */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Repository Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Repository URL</label>
                <div className="flex items-center space-x-2">
                  {details.git.repository_url !== 'Not available' && details.git.repository_url !== 'No remote configured' ? (
                    <>
                      <a
                        href={details.git.repository_url.startsWith('https://') ? details.git.repository_url : `https://github.com/${details.git.repository_url.replace('git@github.com:', '').replace('.git', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-medium text-sm break-all underline"
                      >
                        {details.git.repository_url}
                      </a>
                      <span className="text-blue-400">↗</span>
                    </>
                  ) : (
                    <p className="text-gray-400 font-medium text-sm">{details.git.repository_url}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400">Branch</label>
                <p className="text-white font-medium">{details.git.branch}</p>
              </div>
            </div>
          </div>

          {/* Commit Information */}
          <div className="bg-gray-750 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Latest Commit</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Commit Hash</label>
                  <div className="flex items-center space-x-2">
                    <code className="text-white font-mono text-sm bg-gray-700 px-2 py-1 rounded">
                      {details.git.short_commit}
                    </code>
                    <span className="text-gray-500 text-xs font-mono">
                      ({details.git.commit.substring(0, 12)}...)
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Commit Date</label>
                  <p className="text-white font-medium">
                    {details.git.commit_date !== 'Unknown' 
                      ? new Date(details.git.commit_date).toLocaleString()
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400">Commit Message</label>
                <p className="text-white font-medium bg-gray-700 p-3 rounded text-sm">
                  {details.git.commit_message}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Author</label>
                  <p className="text-white font-medium">{details.git.commit_author}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white font-medium text-sm">
                    {details.git.commit_email || 'Not available'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {details.git.repository_url.startsWith('https://') && (
            <div className="bg-gray-750 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`${details.git.repository_url}/commit/${details.git.commit}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors inline-flex items-center space-x-2"
                >
                  <span>View Commit</span>
                  <span className="text-xs">↗</span>
                </a>
                <a
                  href={`${details.git.repository_url}/tree/${details.git.branch}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors inline-flex items-center space-x-2"
                >
                  <span>View Branch</span>
                  <span className="text-xs">↗</span>
                </a>
                <a
                  href={`${details.git.repository_url}/commits/${details.git.branch}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors inline-flex items-center space-x-2"
                >
                  <span>View History</span>
                  <span className="text-xs">↗</span>
                </a>
              </div>
            </div>
          )}
        </div>
      );

    case 'profiling':
      return (
        <ProcessProfiling 
          processId={details.basic.pm_id} 
          processName={details.basic.name} 
          processDetails={{
            pid: details.basic.pid,
            status: details.basic.status,
            uptime: details.basic.uptime,
            restarts: details.basic.restarts,
            cpu: details.resources.cpu,
            memory: details.resources.memory,
            mode: details.environment.exec_mode,
            instances: details.environment.instances
          }}
        />
      );

    case 'health':
      return (
        <HealthDashboard 
          processId={details.basic.pm_id} 
          processName={details.basic.name}
        />
      );

    default:
      return null;
  }
}
