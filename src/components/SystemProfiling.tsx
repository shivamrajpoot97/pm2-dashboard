'use client';

import { useState, useEffect } from 'react';
import { Activity, MemoryStick, Server, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { ProfilingChart } from './ProfilingChart';

interface SystemProfilingData {
  processId: string;
  processName: string;
  cpuData: any[];
  memoryData: any[];
  lastUpdated: number;
}

interface SystemProfilingProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemProfiling({ isOpen, onClose }: SystemProfilingProps) {
  const [processes, setProcesses] = useState<any[]>([]);
  const [profilingData, setProfilingData] = useState<SystemProfilingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds

  // Fetch all processes
  const fetchProcesses = async () => {
    try {
      const response = await fetch('/api/pm2');
      const result = await response.json();
      if (result.success) {
        setProcesses(result.data.processes);
      }
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    }
  };

  // Fetch profiling data for all processes
  const fetchSystemProfiling = async () => {
    setLoading(true);
    
    try {
      const profilingPromises = processes.map(async (process) => {
        try {
          const [cpuResponse, memoryResponse] = await Promise.all([
            fetch(`/api/pm2/profiling/${process.pm_id}?type=cpu&timeRange=300`),
            fetch(`/api/pm2/profiling/${process.pm_id}?type=memory&timeRange=300`)
          ]);
          
          const cpuResult = await cpuResponse.json();
          const memoryResult = await memoryResponse.json();
          
          return {
            processId: process.pm_id.toString(),
            processName: process.name,
            cpuData: cpuResult.success ? cpuResult.data.profiles : [],
            memoryData: memoryResult.success ? memoryResult.data.profiles : [],
            lastUpdated: Date.now()
          };
        } catch {
          return {
            processId: process.pm_id.toString(),
            processName: process.name,
            cpuData: [],
            memoryData: [],
            lastUpdated: Date.now()
          };
        }
      });
      
      const results = await Promise.all(profilingPromises);
      setProfilingData(results);
    } catch (error) {
      console.error('Failed to fetch system profiling data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate system-wide statistics
  const getSystemStats = () => {
    if (profilingData.length === 0) return null;
    
    const allCpuData = profilingData.flatMap(p => p.cpuData);
    const allMemoryData = profilingData.flatMap(p => p.memoryData);
    
    if (allCpuData.length === 0 && allMemoryData.length === 0) return null;
    
    const cpuValues = allCpuData.map(d => d.value || 0);
    const memoryValues = allMemoryData.map(d => d.heapUsed || 0);
    
    return {
      totalProcesses: profilingData.length,
      avgCpu: cpuValues.length > 0 ? (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length) : 0,
      maxCpu: cpuValues.length > 0 ? Math.max(...cpuValues) : 0,
      totalMemory: memoryValues.length > 0 ? memoryValues.reduce((a, b) => a + b, 0) : 0,
      avgMemory: memoryValues.length > 0 ? (memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length) : 0
    };
  };

  useEffect(() => {
    if (isOpen) {
      fetchProcesses();
    }
  }, [isOpen]);

  useEffect(() => {
    if (processes.length > 0) {
      fetchSystemProfiling();
    }
  }, [processes]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    
    const interval = setInterval(() => {
      if (processes.length > 0) {
        fetchSystemProfiling();
      }
    }, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, refreshInterval, processes]);

  if (!isOpen) return null;

  const stats = getSystemStats();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">System Profiling</h2>
              <p className="text-sm text-gray-400">
                Performance profiling for all PM2 processes
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Auto-refresh:</label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                disabled={!autoRefresh}
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
              </select>
            </div>
            <button
              onClick={fetchSystemProfiling}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* System Stats */}
        {stats && (
          <div className="p-6 border-b border-gray-700 bg-gray-750">
            <h3 className="text-lg font-medium text-white mb-4">System Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.totalProcesses}</p>
                <p className="text-sm text-gray-400">Active Processes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.avgCpu.toFixed(1)}%</p>
                <p className="text-sm text-gray-400">Avg CPU</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{stats.maxCpu.toFixed(1)}%</p>
                <p className="text-sm text-gray-400">Peak CPU</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{formatBytes(stats.totalMemory)}</p>
                <p className="text-sm text-gray-400">Total Memory</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{formatBytes(stats.avgMemory)}</p>
                <p className="text-sm text-gray-400">Avg Memory</p>
              </div>
            </div>
          </div>
        )}

        {/* Process Profiling Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && profilingData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <span className="ml-3 text-gray-400">Loading system profiling data...</span>
            </div>
          ) : profilingData.length === 0 ? (
            <div className="text-center py-12">
              <Server className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Profiling Data</h3>
              <p className="text-gray-500">
                No processes found or profiling data unavailable
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {profilingData.map((processData) => (
                <div key={processData.processId} className="space-y-4">
                  <div className="bg-gray-750 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-white font-medium">{processData.processName}</h4>
                        <p className="text-sm text-gray-400">Process ID: {processData.processId}</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        Updated: {new Date(processData.lastUpdated).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {/* CPU Chart */}
                    <div className="mb-4">
                      <ProfilingChart 
                        data={processData.cpuData} 
                        type="cpu" 
                        height={150}
                      />
                    </div>
                    
                    {/* Memory Chart */}
                    <div>
                      <ProfilingChart 
                        data={processData.memoryData} 
                        type="memory" 
                        height={150}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-750">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {profilingData.length} processes monitored
              {stats && ` • Avg CPU: ${stats.avgCpu.toFixed(1)}% • Total Memory: ${formatBytes(stats.totalMemory)}`}
            </span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <span>CPU</span>
              </div>
              <div className="flex items-center space-x-2">
                <MemoryStick className="h-4 w-4 text-purple-400" />
                <span>Memory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}