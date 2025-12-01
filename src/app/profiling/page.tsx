'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Activity, Cpu, MemoryStick, HardDrive, Network, ArrowLeft, Calendar, TrendingUp, BarChart3, Clock, History, Eye, Settings } from 'lucide-react';
import Link from 'next/link';
import { HistoricalProfiling } from '@/components/HistoricalProfiling';

export default function ProfilingPage() {
  const { isAuthenticated } = useAuth();
  const [profiling, setProfiling] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'1h' | '24h' | '1w' | '15d' | '1m'>('15d');
  const [showHistorical, setShowHistorical] = useState(false);
  const [viewMode, setViewMode] = useState<'live' | 'historical' | 'advanced'>('live');

  const fetchHistoricalData = async (period: string) => {
    setHistoricalLoading(true);
    try {
      const response = await fetch(`/api/pm2/historical?period=${period}`);
      const result = await response.json();
      
      if (result.success && result.data.dataPoints) {
        const dataPoints = result.data.dataPoints;
        
        setHistoricalData({
          cpu: {
            usage: dataPoints.map((d: any) => ({
              timestamp: d.timestamp,
              value: d.system.cpu.usage
            })),
            loadAvg: dataPoints.map((d: any) => ({
              timestamp: d.timestamp,
              value: d.system.cpu.loadAvg
            }))
          },
          memory: {
            used: dataPoints.map((d: any) => ({
              timestamp: d.timestamp,
              value: d.system.memory.usagePercent
            }))
          },
          disk: {
            readOps: dataPoints.map((d: any) => ({
              timestamp: d.timestamp,
              value: d.system.disk.reads
            })),
            writeOps: dataPoints.map((d: any) => ({
              timestamp: d.timestamp,
              value: d.system.disk.writes
            }))
          },
          network: {
            eth0_rx: dataPoints.map((d: any) => ({
              timestamp: d.timestamp,
              value: d.system.network.rx / (1024 * 1024)
            })),
            eth0_tx: dataPoints.map((d: any) => ({
              timestamp: d.timestamp,
              value: d.system.network.tx / (1024 * 1024)
            }))
          },
          processes: {
            total: dataPoints.map((d: any) => ({
              timestamp: d.timestamp,
              value: d.system.processes.total
            })),
            running: dataPoints.map((d: any) => ({
              timestamp: d.timestamp,
              value: d.system.processes.online
            }))
          }
        });
      } else {
        console.error('Failed to fetch historical data:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    } finally {
      setHistoricalLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchProfiling = async () => {
      try {
        setProfiling({
          system: {
            cpu: {
              cores: 8,
              usage: 23.5,
              loadAvg: [1.2, 1.5, 1.8],
              temperature: 65
            },
            memory: {
              total: 16 * 1024 * 1024 * 1024,
              used: 8.5 * 1024 * 1024 * 1024,
              buffers: 512 * 1024 * 1024,
              cache: 2 * 1024 * 1024 * 1024
            },
            disk: {
              reads: 1250,
              writes: 890,
              readSpeed: '45 MB/s',
              writeSpeed: '32 MB/s'
            },
            network: {
              interfaces: [
                { name: 'eth0', rx: 1024 * 1024 * 50, tx: 1024 * 1024 * 35 },
                { name: 'lo', rx: 1024 * 1024 * 2, tx: 1024 * 1024 * 2 }
              ]
            }
          },
          processes: {
            total: 156,
            running: 23,
            sleeping: 120,
            zombie: 0,
            topCpu: [
              { name: 'node', cpu: 15.2, memory: 256 * 1024 * 1024 },
              { name: 'chrome', cpu: 8.5, memory: 512 * 1024 * 1024 },
              { name: 'pm2', cpu: 2.1, memory: 64 * 1024 * 1024 }
            ]
          }
        });
      } catch (error) {
        console.error('Failed to fetch profiling data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiling();
    const interval = setInterval(fetchProfiling, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (viewMode === 'historical') {
      setShowHistorical(true);
      fetchHistoricalData(timePeriod);
    }
  }, [viewMode, timePeriod]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4">Access Denied</h1>
          <Link href="/" className="text-blue-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading system profiling...</p>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timePeriod === '1h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (timePeriod === '24h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (timePeriod === '1w') return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (timePeriod === '15d') return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const SimpleChart = ({ data, color, unit = '', height = 60 }: { data: any[], color: string, unit?: string, height?: number }) => {
    if (!data || data.length === 0) return <div className="text-gray-500">No data</div>;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    return (
      <div className="relative">
        <div className="flex items-end justify-between" style={{ height: `${height}px` }}>
          {data.slice(-20).map((point, i) => {
            const barHeight = ((point.value - minValue) / range) * (height - 10) + 5;
            return (
              <div
                key={i}
                className={`${color} rounded-t transition-all duration-300 hover:opacity-80`}
                style={{ height: `${barHeight}px`, width: `${100 / 20}%`, marginRight: '1px' }}
                title={`${point.value.toFixed(2)}${unit} at ${formatTimestamp(point.timestamp)}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{minValue.toFixed(1)}{unit}</span>
          <span>{maxValue.toFixed(1)}{unit}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-blue-400 hover:text-blue-300">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-bold">System Profiling</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Selector */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('live')}
                className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
                  viewMode === 'live' ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Live</span>
              </button>
              <button
                onClick={() => setViewMode('historical')}
                className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
                  viewMode === 'historical' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Simple Charts</span>
              </button>
              <button
                onClick={() => setViewMode('advanced')}
                className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
                  viewMode === 'advanced' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>15+ Days Historical</span>
              </button>
            </div>
            
            {/* Time Period Selector */}
            {(viewMode === 'historical' || viewMode === 'advanced') && (
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value as any)}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="1w">Last Week</option>
                <option value="15d">Last 15 Days</option>
                <option value="1m">Last Month</option>
              </select>
            )}
            
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" title="Live Data Collection Active" />
          </div>
        </div>

        {/* Info Banner for Historical Views */}
        {(viewMode === 'advanced' || (viewMode === 'historical' && (timePeriod === '15d' || timePeriod === '1m'))) && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <History className="h-6 w-6 text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="text-blue-400 font-medium">Enhanced 15+ Days Historical Profiling</h3>
                <p className="text-blue-300 text-sm mt-1">
                  Advanced data collection with {timePeriod === '15d' ? '15 days' : '30 days'} retention • 
                  30-second collection intervals • Automatic data aggregation for performance • 
                  File-based persistence • Up to 100,000 data points stored
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Advanced Historical View */}
        {viewMode === 'advanced' && (
          <HistoricalProfiling />
        )}

        {/* Simple Historical Charts View */}
        {viewMode === 'historical' && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-indigo-400" />
                </div>
                <span>
                  Simple Historical Charts - {
                    timePeriod === '1h' ? 'Last Hour' : 
                    timePeriod === '24h' ? 'Last 24 Hours' : 
                    timePeriod === '1w' ? 'Last Week' : 
                    timePeriod === '15d' ? 'Last 15 Days' : 
                    'Last Month'
                  }
                </span>
              </h2>
              {historicalLoading && (
                <div className="flex items-center space-x-2 text-gray-400">
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              )}
            </div>
            
                        {historicalData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* CPU Historical */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center space-x-2">
                    <Cpu className="w-4 h-4" />
                    <span>CPU Usage</span>
                  </h3>
                  <SimpleChart data={historicalData.cpu.usage} color="bg-blue-500" unit="%" height={80} />
                </div>
                
                {/* Memory Historical */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center space-x-2">
                    <MemoryStick className="w-4 h-4" />
                    <span>Memory Usage</span>
                  </h3>
                  <SimpleChart data={historicalData.memory.used} color="bg-purple-500" unit="%" height={80} />
                </div>
                
                {/* Load Average */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>Load Average</span>
                  </h3>
                  <SimpleChart data={historicalData.cpu.loadAvg} color="bg-green-500" unit="" height={80} />
                </div>
                
                {/* Disk I/O */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center space-x-2">
                    <HardDrive className="w-4 h-4" />
                    <span>Disk Read Ops</span>
                  </h3>
                  <SimpleChart data={historicalData.disk.readOps} color="bg-yellow-500" unit="/s" height={80} />
                </div>
                
                {/* Network RX */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center space-x-2">
                    <Network className="w-4 h-4" />
                    <span>Network RX</span>
                  </h3>
                  <SimpleChart data={historicalData.network.eth0_rx} color="bg-cyan-500" unit="MB/s" height={80} />
                </div>
                
                {/* Process Count */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-sm font-semibold text-pink-400 mb-3 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Process Count</span>
                  </h3>
                  <SimpleChart data={historicalData.processes.total} color="bg-pink-500" unit="" height={80} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No historical data available</p>
                <p className="text-gray-500 text-sm">Historical data will appear as the system collects metrics over time</p>
              </div>
            )}
          </div>
        )}
        
        {/* Live System Monitoring View */}
        {viewMode === 'live' && (
          <>
            {/* CPU Section */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Cpu className="w-6 h-6 text-blue-400" />
                </div>
                <span>CPU Performance</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <p className="text-gray-300 text-sm font-medium mb-2">CPU Usage</p>
                  <p className="text-4xl font-bold text-blue-400 mb-3">{profiling.system.cpu.usage}%</p>
                  <div className="w-full bg-gray-600 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-500 shadow-sm" 
                      style={{ width: `${profiling.system.cpu.usage}%` }} 
                    />
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <p className="text-gray-300 text-sm font-medium mb-2">Load Average</p>
                  <p className="text-2xl font-bold text-green-400 font-mono mb-2">{profiling.system.cpu.loadAvg.join(', ')}</p>
                  <p className="text-sm text-gray-400">1m, 5m, 15m intervals</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <p className="text-gray-300 text-sm font-medium mb-2">Temperature</p>
                  <p className="text-4xl font-bold text-yellow-400 mb-2">{profiling.system.cpu.temperature}°C</p>
                  <div className={`w-full h-3 rounded-full ${
                    profiling.system.cpu.temperature > 80 ? 'bg-red-500' :
                    profiling.system.cpu.temperature > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`} style={{ width: `${Math.min((profiling.system.cpu.temperature / 100) * 100, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Memory Section */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <MemoryStick className="w-6 h-6 text-purple-400" />
                </div>
                <span>Memory Usage</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <p className="text-gray-300 text-sm font-medium mb-2">Total Memory</p>
                  <p className="text-2xl font-bold text-white">{formatBytes(profiling.system.memory.total)}</p>
                  <div className="mt-2 flex items-center text-xs text-gray-400">
                    <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
                    System Total
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <p className="text-gray-300 text-sm font-medium mb-2">Used</p>
                  <p className="text-2xl font-bold text-purple-400">{formatBytes(profiling.system.memory.used)}</p>
                  <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${(profiling.system.memory.used / profiling.system.memory.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <p className="text-gray-300 text-sm font-medium mb-2">Buffers</p>
                  <p className="text-2xl font-bold text-green-400">{formatBytes(profiling.system.memory.buffers)}</p>
                  <div className="mt-2 flex items-center text-xs text-gray-400">
                    <div className="w-3 h-3 bg-green-400 rounded mr-2"></div>
                    System Buffers
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <p className="text-gray-300 text-sm font-medium mb-2">Cache</p>
                  <p className="text-2xl font-bold text-blue-400">{formatBytes(profiling.system.memory.cache)}</p>
                  <div className="mt-2 flex items-center text-xs text-gray-400">
                    <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
                    File Cache
                  </div>
                </div>
              </div>
            </div>

            {/* Disk & Network */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
                <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <HardDrive className="w-6 h-6 text-green-400" />
                  </div>
                  <span>Disk I/O Performance</span>
                </h2>
                <div className="space-y-4">
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 font-medium">Read Operations</span>
                      <span className="font-mono text-xl font-bold text-green-400">{profiling.system.disk.reads}<span className="text-sm text-gray-400">/s</span></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Speed</span>
                      <span className="font-mono text-green-400">{profiling.system.disk.readSpeed}</span>
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 font-medium">Write Operations</span>
                      <span className="font-mono text-xl font-bold text-yellow-400">{profiling.system.disk.writes}<span className="text-sm text-gray-400">/s</span></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Speed</span>
                      <span className="font-mono text-yellow-400">{profiling.system.disk.writeSpeed}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
                <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Network className="w-6 h-6 text-yellow-400" />
                  </div>
                  <span>Network Interfaces</span>
                </h2>
                <div className="space-y-3">
                  {profiling.system.network.interfaces.map((iface: any, idx: number) => (
                    <div key={idx} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg text-white">{iface.name}</h3>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">↓ RECEIVED</div>
                          <div className="text-sm font-mono text-blue-400">{formatBytes(iface.rx)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">↑ TRANSMITTED</div>
                          <div className="text-sm font-mono text-purple-400">{formatBytes(iface.tx)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Processes */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Top Processes</h2>
              <div className="space-y-3">
                {profiling.processes.topCpu.map((proc: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <span className="font-medium">{proc.name}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-blue-400">{proc.cpu}% CPU</span>
                      <span className="text-purple-400">{formatBytes(proc.memory)} RAM</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
              