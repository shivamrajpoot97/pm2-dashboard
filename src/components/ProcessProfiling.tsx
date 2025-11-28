'use client';

import { useState, useEffect } from 'react';
import { Activity, MemoryStick, Play, Square, Download, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { ProfilingChart } from './ProfilingChart';

interface ProfilingData {
  processId: string;
  type: 'cpu' | 'memory';
  profiles: any[];
  generatedAt: number;
}

interface ProcessProfilingProps {
  processId: number;
  processName: string;
  processDetails?: {
    pid: number;
    status: string;
    uptime: number;
    restarts: number;
    cpu: number;
    memory: number;
    mode: string;
    instances: number;
  };
}

export function ProcessProfiling({ processId, processName, processDetails }: ProcessProfilingProps) {
  const [activeTab, setActiveTab] = useState<'cpu' | 'memory'>('cpu');
  const [isRunning, setIsRunning] = useState(false);
  const [profilingData, setProfilingData] = useState<ProfilingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(60); // seconds

  // Start profiling
  const startProfiling = async (type: 'cpu' | 'memory') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/pm2/profiling/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, duration })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsRunning(true);
        setActiveTab(type);
        // Auto-stop after duration
        setTimeout(() => {
          stopProfiling(type);
        }, duration * 1000);
      } else {
        setError(result.error || 'Failed to start profiling');
      }
    } catch (err: any) {
      setError('Failed to start profiling: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stop profiling
  const stopProfiling = async (type: 'cpu' | 'memory') => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/pm2/profiling/${processId}?type=${type}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsRunning(false);
        await fetchProfilingData(type);
      } else {
        setError(result.error || 'Failed to stop profiling');
      }
    } catch (err: any) {
      setError('Failed to stop profiling: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch profiling data
  const fetchProfilingData = async (type: 'cpu' | 'memory') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/pm2/profiling/${processId}?type=${type}&timeRange=3600`);
      const result = await response.json();
      
      if (result.success) {
        setProfilingData(result.data);
      } else {
        setError(result.error || 'Failed to fetch profiling data');
      }
    } catch (err: any) {
      setError('Failed to fetch profiling data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from profiling data
  const getStatistics = (data: any[]) => {
    if (!data || data.length === 0) return null;
    
    if (activeTab === 'cpu') {
      const values = data.map(d => d.value || 0);
      return {
        average: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        max: Math.max(...values).toFixed(2),
        min: Math.min(...values).toFixed(2),
        samples: values.length
      };
    } else {
      const values = data.map(d => d.heapUsed || 0);
      return {
        average: formatBytes(values.reduce((a, b) => a + b, 0) / values.length),
        max: formatBytes(Math.max(...values)),
        min: formatBytes(Math.min(...values)),
        samples: values.length
      };
    }
  };

  useEffect(() => {
    fetchProfilingData(activeTab);
  }, [processId, activeTab]);

  const stats = profilingData ? getStatistics(profilingData.profiles) : null;

  return (
    <div className="space-y-6">
      {/* Process Information */}
      <div className="bg-gray-750 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Process Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{processId}</p>
            <p className="text-sm text-gray-400">PM2 ID</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{processDetails?.pid || 'N/A'}</p>
            <p className="text-sm text-gray-400">Process PID</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${
              processDetails?.status === 'online' ? 'text-green-400' : 'text-red-400'
            }`}>
              {processDetails?.status || 'Unknown'}
            </p>
            <p className="text-sm text-gray-400">Status</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{processDetails?.restarts || 0}</p>
            <p className="text-sm text-gray-400">Restarts</p>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Current CPU</p>
                <p className="text-2xl font-bold text-blue-400">
                  {processDetails?.cpu?.toFixed(1) || '0.0'}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Current Memory</p>
                <p className="text-2xl font-bold text-purple-400">
                  {processDetails?.memory ? formatBytes(processDetails.memory) : '0 B'}
                </p>
              </div>
              <MemoryStick className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Execution Mode</p>
                <p className="text-lg font-bold text-green-400">
                  {processDetails?.mode || 'fork'}
                </p>
                <p className="text-sm text-gray-400">
                  {processDetails?.instances || 1} instance(s)
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <span className="text-blue-400 font-medium">Profiling Target</span>
          </div>
          <p className="text-white mt-1">
            Process: <span className="font-mono text-green-400">{processName}</span>
          </p>
          <p className="text-gray-300 text-sm mt-1">
            Use the profiling tools below to analyze CPU usage patterns and memory consumption for this process.
          </p>
        </div>
      </div>

      {/* Profiling Controls */}
      <div className="bg-gray-750 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Performance Profiling</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>CPU</span>
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>Memory</span>
          </div>
        </div>
        
        {/* Profiling Configuration */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="text-white font-medium mb-3">Profiling Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Duration (seconds)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                min="10"
                max="300"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">10-300 seconds</p>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Sample Rate</label>
              <select className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm">
                <option value="1000">1 second</option>
                <option value="5000" selected>5 seconds</option>
                <option value="10000">10 seconds</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Data collection interval</p>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Profile Type</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('cpu')}
                  className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                    activeTab === 'cpu'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  CPU
                </button>
                <button
                  onClick={() => setActiveTab('memory')}
                  className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                    activeTab === 'memory'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Memory
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          
          {!isRunning ? (
            <button
              onClick={() => startProfiling(activeTab)}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>{loading ? 'Starting...' : `Start ${activeTab.toUpperCase()} Profiling`}</span>
            </button>
          ) : (
            <button
              onClick={() => stopProfiling(activeTab)}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              <Square className="h-4 w-4" />
              <span>{loading ? 'Stopping...' : `Stop ${activeTab.toUpperCase()} Profiling`}</span>
            </button>
          )}
          
          <button
            onClick={() => fetchProfilingData(activeTab)}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-md transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {isRunning && (
          <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-400 animate-pulse" />
              <span className="text-green-400 font-medium">
                {activeTab.toUpperCase()} profiling is running for process {processName} (#{processId})
              </span>
            </div>
            <p className="text-green-300 text-sm mt-1">
              Profiling will automatically stop in {duration} seconds
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="bg-gray-750 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {activeTab.toUpperCase()} Profile Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.average}</p>
              <p className="text-sm text-gray-400">
                Average {activeTab === 'cpu' ? 'CPU %' : 'Memory'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{stats.max}</p>
              <p className="text-sm text-gray-400">
                Peak {activeTab === 'cpu' ? 'CPU %' : 'Memory'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{stats.min}</p>
              <p className="text-sm text-gray-400">
                Minimum {activeTab === 'cpu' ? 'CPU %' : 'Memory'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.samples}</p>
              <p className="text-sm text-gray-400">Data Points</p>
            </div>
          </div>
        </div>
      )}

      {/* Profiling Results */}
      <div className="bg-gray-750 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {activeTab.toUpperCase()} Profile Data
          </h3>
          {profilingData && (
            <button className="flex items-center space-x-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">Loading profiling data...</span>
          </div>
        ) : profilingData?.profiles?.length > 0 ? (
          <div className="space-y-4">
            {/* Chart Visualization */}
            <ProfilingChart 
              data={profilingData.profiles} 
              type={activeTab} 
              height={300}
            />
            
            {/* Raw Data Table */}
            <div className="bg-gray-800 rounded p-4 max-h-64 overflow-y-auto">
              <h5 className="text-white font-medium mb-3">Raw Data (Last 20 points)</h5>
              <div className="font-mono text-xs space-y-1">
                {profilingData.profiles.slice(-20).map((profile, index) => (
                  <div key={index} className="flex justify-between text-gray-300 hover:bg-gray-700 px-2 py-1 rounded">
                    <span>{new Date(profile.timestamp).toLocaleTimeString()}</span>
                    <span className={activeTab === 'cpu' ? 'text-blue-400' : 'text-purple-400'}>
                      {activeTab === 'cpu' 
                        ? `${(profile.value || 0).toFixed(2)}%` 
                        : formatBytes(profile.heapUsed || 0)
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-sm text-gray-400">
              Total: {profilingData.profiles.length} data points • Generated at {new Date(profilingData.generatedAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profiling Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                <h4 className="text-blue-400 font-medium">Getting Started with Profiling</h4>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                  <div>
                    <p className="text-white font-medium">Choose Profile Type</p>
                    <p className="text-gray-300">Select CPU profiling to analyze processing patterns or Memory profiling to track memory usage.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                  <div>
                    <p className="text-white font-medium">Configure Duration</p>
                    <p className="text-gray-300">Set profiling duration (10-300 seconds). Longer durations provide more data but use more resources.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                  <div>
                    <p className="text-white font-medium">Start Profiling</p>
                    <p className="text-gray-300">Click "Start Profiling" to begin data collection. Charts will update in real-time.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* What to Expect */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <h4 className="text-white font-medium">CPU Profiling</h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• CPU usage percentage over time</li>
                  <li>• Processing spikes and patterns</li>
                  <li>• Performance bottleneck identification</li>
                  <li>• Function-level analysis (advanced)</li>
                </ul>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <MemoryStick className="h-5 w-5 text-purple-400" />
                  <h4 className="text-white font-medium">Memory Profiling</h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Heap memory usage tracking</li>
                  <li>• Memory leak detection</li>
                  <li>• Garbage collection patterns</li>
                  <li>• Memory allocation analysis</li>
                </ul>
              </div>
            </div>
            
            {/* No Data State */}
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">No profiling data available</p>
              <p className="text-gray-500 text-sm">
                Configure settings above and start {activeTab} profiling to collect performance data
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}