'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Activity, Cpu, MemoryStick, HardDrive, Network, Download, RefreshCw, BarChart3, PieChart, LineChart, Filter, Eye, EyeOff } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface HistoricalData {
  timestamp: number;
  system: {
    cpu: {
      usage: number;
      loadAvg: number;
      cores: number;
    };
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    disk: {
      reads: number;
      writes: number;
    };
    network: {
      rx: number;
      tx: number;
    };
    processes: {
      total: number;
      online: number;
      pm2Memory: number;
    };
  };
  processes: Array<{
    pm_id: number;
    name: string;
    cpu: number;
    memory: number;
    status: string;
    restarts: number;
    pid: number;
    uptime: number;
  }>;
  aggregated?: boolean;
  bucketSize?: number;
}

interface HistoricalProfilingProps {
  processId?: number;
  processName?: string;
}

export function HistoricalProfiling({ processId, processName }: HistoricalProfilingProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<'1h' | '24h' | '1w' | '15d' | '1m'>('15d');
  const [selectedMetrics, setSelectedMetrics] = useState({
    cpu: true,
    memory: true,
    disk: true,
    network: true,
    processes: true
  });
  const [viewMode, setViewMode] = useState<'charts' | 'table' | 'summary'>('charts');
  const [showAggregationInfo, setShowAggregationInfo] = useState(false);

  const fetchHistoricalData = async (period: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = processId 
        ? `/api/pm2/historical?period=${period}&processId=${processId}`
        : `/api/pm2/historical?period=${period}`;
        
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success && result.data.dataPoints) {
        setHistoricalData(result.data.dataPoints);
        
        // Show aggregation info for longer periods
        if (result.data.summary?.aggregated) {
          setShowAggregationInfo(true);
        }
      } else {
        setError(result.error || 'Failed to fetch historical data');
      }
    } catch (err: any) {
      setError('Failed to fetch historical data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoricalData(timePeriod);
  }, [timePeriod, processId]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timePeriod === '1h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (timePeriod === '24h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (timePeriod === '1w') return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (timePeriod === '15d') return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const exportData = () => {
    const dataStr = JSON.stringify(historicalData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historical-profiling-${timePeriod}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatistics = (data: HistoricalData[], metric: string) => {
    if (!data || data.length === 0) return null;
    
    let values: number[] = [];
    
    switch (metric) {
      case 'cpu':
        values = data.map(d => d.system.cpu.usage);
        break;
      case 'memory':
        values = data.map(d => d.system.memory.usagePercent);
        break;
      case 'loadAvg':
        values = data.map(d => d.system.cpu.loadAvg);
        break;
      case 'diskReads':
        values = data.map(d => d.system.disk.reads);
        break;
      case 'diskWrites':
        values = data.map(d => d.system.disk.writes);
        break;
      case 'networkRx':
        values = data.map(d => d.system.network.rx / (1024 * 1024)); // MB
        break;
      case 'networkTx':
        values = data.map(d => d.system.network.tx / (1024 * 1024)); // MB
        break;
      case 'processes':
        values = data.map(d => d.system.processes.total);
        break;
    }
    
    if (values.length === 0) return null;
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const latest = values[values.length - 1];
    
    return { avg, max, min, latest, samples: values.length };
  };

  const AdvancedChart = ({ data, metric, color, unit = '', title }: { 
    data: HistoricalData[], 
    metric: string, 
    color: string, 
    unit?: string, 
    title: string 
  }) => {
    if (!data || data.length === 0) return <div className="text-gray-500">No data available</div>;
    
    const stats = getStatistics(data, metric);
    if (!stats) return <div className="text-gray-500">No data available</div>;
    
    const chartData = data.map(d => {
      let value = 0;
      switch (metric) {
        case 'cpu': value = d.system.cpu.usage; break;
        case 'memory': value = d.system.memory.usagePercent; break;
        case 'loadAvg': value = d.system.cpu.loadAvg; break;
        case 'diskReads': value = d.system.disk.reads; break;
        case 'diskWrites': value = d.system.disk.writes; break;
        case 'networkRx': value = d.system.network.rx / (1024 * 1024); break;
        case 'networkTx': value = d.system.network.tx / (1024 * 1024); break;
        case 'processes': value = d.system.processes.total; break;
      }
      return { timestamp: d.timestamp, value };
    });
    
    const maxValue = Math.max(...chartData.map(d => d.value));
    const minValue = Math.min(...chartData.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    return (
      <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${color.replace('bg-', 'text-')}`}>{title}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>{stats.samples} points</span>
            {data[0]?.aggregated && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                Aggregated
              </span>
            )}
          </div>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-400">Current</p>
            <p className="text-lg font-bold text-white">{stats.latest.toFixed(2)}{unit}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400">Average</p>
            <p className="text-lg font-bold text-blue-400">{stats.avg.toFixed(2)}{unit}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400">Peak</p>
            <p className="text-lg font-bold text-red-400">{stats.max.toFixed(2)}{unit}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400">Minimum</p>
            <p className="text-lg font-bold text-green-400">{stats.min.toFixed(2)}{unit}</p>
          </div>
        </div>
        
        {/* Chart */}
        <div className="relative bg-gray-800 rounded-lg p-4" style={{ height: '200px' }}>
          <div className="flex items-end justify-between h-full">
            {chartData.slice(-50).map((point, i) => {
              const barHeight = ((point.value - minValue) / range) * 160 + 5;
              return (
                <div key={i} className="flex flex-col items-center group relative">
                  <div
                    className={`${color} rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer`}
                    style={{ 
                      height: `${barHeight}px`, 
                      width: `${Math.max(100 / 50, 2)}%`,
                      marginRight: '1px'
                    }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    <div>{point.value.toFixed(2)}{unit}</div>
                    <div className="text-gray-400">{formatTimestamp(point.timestamp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-12">
            <span>{maxValue.toFixed(1)}{unit}</span>
            <span>{((maxValue + minValue) / 2).toFixed(1)}{unit}</span>
            <span>{minValue.toFixed(1)}{unit}</span>
          </div>
        </div>
        
        {/* Time range */}
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{formatTimestamp(chartData[0]?.timestamp)}</span>
          <span>{formatTimestamp(chartData[chartData.length - 1]?.timestamp)}</span>
        </div>
      </div>
    );
  };

  const SummaryView = () => {
    const metrics = ['cpu', 'memory', 'loadAvg', 'diskReads', 'diskWrites', 'networkRx', 'networkTx', 'processes'];
    const metricLabels = {
      cpu: 'CPU Usage',
      memory: 'Memory Usage',
      loadAvg: 'Load Average',
      diskReads: 'Disk Reads',
      diskWrites: 'Disk Writes',
      networkRx: 'Network RX',
      networkTx: 'Network TX',
      processes: 'Process Count'
    };
    const metricUnits = {
      cpu: '%',
      memory: '%',
      loadAvg: '',
      diskReads: '/s',
      diskWrites: '/s',
      networkRx: ' MB/s',
      networkTx: ' MB/s',
      processes: ''
    };
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(metric => {
          const stats = getStatistics(historicalData, metric);
          if (!stats) return null;
          
          return (
            <div key={metric} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="text-sm font-medium text-gray-300 mb-3">{metricLabels[metric as keyof typeof metricLabels]}</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Current</span>
                  <span className="text-sm font-medium text-white">
                    {stats.latest.toFixed(2)}{metricUnits[metric as keyof typeof metricUnits]}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Average</span>
                  <span className="text-sm font-medium text-blue-400">
                    {stats.avg.toFixed(2)}{metricUnits[metric as keyof typeof metricUnits]}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Peak</span>
                  <span className="text-sm font-medium text-red-400">
                    {stats.max.toFixed(2)}{metricUnits[metric as keyof typeof metricUnits]}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Samples</span>
                  <span className="text-sm font-medium text-gray-300">
                    {stats.samples}
                  </span>
                </div>
              </div>
              
              {/* Mini trend indicator */}
              <div className="mt-3 flex items-center justify-between">
                <div className="w-full bg-gray-600 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats.latest / stats.max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
          );
  };

  const TableView = () => (
    <div className="bg-gray-700/50 rounded-lg border border-gray-600 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">CPU %</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Memory %</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Load Avg</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Disk R/W</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Network RX/TX</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Processes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600">
            {historicalData.slice(-100).reverse().map((data, index) => (
              <tr key={index} className="hover:bg-gray-600/30">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                  {new Date(data.timestamp).toLocaleString()}
                  {data.aggregated && (
                    <span className="ml-2 px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                      AGG
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                  <span className={`${data.system.cpu.usage > 80 ? 'text-red-400' : data.system.cpu.usage > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {data.system.cpu.usage.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                  <span className={`${data.system.memory.usagePercent > 80 ? 'text-red-400' : data.system.memory.usagePercent > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {data.system.memory.usagePercent.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-white">
                  {data.system.cpu.loadAvg.toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-300">
                  {data.system.disk.reads.toFixed(0)}/{data.system.disk.writes.toFixed(0)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-300">
                  {(data.system.network.rx / (1024 * 1024)).toFixed(1)}/{(data.system.network.tx / (1024 * 1024)).toFixed(1)} MB
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                  <span className="text-white">{data.system.processes.total}</span>
                  <span className="text-green-400 ml-1">({data.system.processes.online} online)</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading historical profiling data...</p>
          <p className="text-sm text-gray-500 mt-1">
            Fetching {timePeriod === '15d' ? '15 days' : timePeriod === '1m' ? '30 days' : timePeriod} of performance data
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-red-400 font-medium mb-2">Error Loading Historical Data</h3>
        <p className="text-red-300 mb-4">{error}</p>
        <button
          onClick={() => fetchHistoricalData(timePeriod)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
              </div>
              <span>
                Historical Profiling
                {processName && <span className="text-blue-400"> - {processName}</span>}
              </span>
            </h2>
            <p className="text-gray-400 mt-1">
              {historicalData.length > 0 
                ? `Showing ${historicalData.length} data points over ${
                    timePeriod === '1h' ? 'the last hour' :
                    timePeriod === '24h' ? 'the last 24 hours' :
                    timePeriod === '1w' ? 'the last week' :
                    timePeriod === '15d' ? 'the last 15 days' :
                    'the last month'
                  }`
                : 'No historical data available'
              }
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Time Period Selector */}
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as any)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="1w">Last Week</option>
              <option value="15d">Last 15 Days</option>
              <option value="1m">Last Month</option>
            </select>
            
            {/* View Mode Selector */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('charts')}
                className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
                  viewMode === 'charts' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <LineChart className="h-4 w-4" />
                <span>Charts</span>
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
                  viewMode === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <PieChart className="h-4 w-4" />
                <span>Summary</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Table</span>
              </button>
            </div>
            
            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => fetchHistoricalData(timePeriod)}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              <button
                onClick={exportData}
                disabled={historicalData.length === 0}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Aggregation Info */}
        {showAggregationInfo && historicalData[0]?.aggregated && (
          <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 font-medium">Data Aggregation</span>
            </div>
            <p className="text-blue-300 text-sm mt-1">
              Data points are averaged over {
                timePeriod === '1w' ? '10-minute' :
                timePeriod === '15d' ? '1-hour' :
                '2-hour'
              } intervals for this time range to optimize performance and readability.
              Each point represents {historicalData[0]?.bucketSize || 'multiple'} original measurements.
            </p>
          </div>
        )}
      </div>

      {historicalData.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">No Historical Data Available</h3>
          <p className="text-gray-400 mb-4">
            Historical data collection is running in the background. 
            Data will become available as the system collects performance metrics over time.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="text-blue-400 font-medium mb-2">Data Collection Schedule</h4>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• Metrics collected every 30 seconds</li>
              <li>• Data retained for 30 days</li>
              <li>• Automatic aggregation for longer periods</li>
              <li>• File-based persistence across restarts</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metric Filters (for Charts view) */}
          {viewMode === 'charts' && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-medium mb-3 flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Metric Visibility</span>
              </h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(selectedMetrics).map(([metric, enabled]) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetrics(prev => ({ ...prev, [metric]: !enabled }))}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      enabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <span className="capitalize">{metric}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content based on view mode */}
          {viewMode === 'summary' && <SummaryView />}
          
          {viewMode === 'table' && <TableView />}
          
          {viewMode === 'charts' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {selectedMetrics.cpu && (
                <AdvancedChart 
                  data={historicalData} 
                  metric="cpu" 
                  color="bg-blue-500" 
                  unit="%" 
                  title="CPU Usage" 
                />
              )}
              
              {selectedMetrics.memory && (
                <AdvancedChart 
                  data={historicalData} 
                  metric="memory" 
                  color="bg-purple-500" 
                  unit="%" 
                  title="Memory Usage" 
                />
              )}
              
              {selectedMetrics.cpu && (
                <AdvancedChart 
                  data={historicalData} 
                  metric="loadAvg" 
                  color="bg-green-500" 
                  unit="" 
                  title="System Load Average" 
                />
              )}
              
                            {selectedMetrics.disk && (
                <AdvancedChart 
                  data={historicalData} 
                  metric="diskReads" 
                  color="bg-yellow-500" 
                  unit="/s" 
                  title="Disk Read Operations" 
                />
              )}
              
              {selectedMetrics.disk && (
                <AdvancedChart 
                  data={historicalData} 
                  metric="diskWrites" 
                  color="bg-orange-500" 
                  unit="/s" 
                  title="Disk Write Operations" 
                />
              )}
              
              {selectedMetrics.network && (
                <AdvancedChart 
                  data={historicalData} 
                  metric="networkRx" 
                  color="bg-cyan-500" 
                  unit=" MB/s" 
                  title="Network Received" 
                />
              )}
              
              {selectedMetrics.network && (
                <AdvancedChart 
                  data={historicalData} 
                  metric="networkTx" 
                  color="bg-pink-500" 
                  unit=" MB/s" 
                  title="Network Transmitted" 
                />
              )}
              
              {selectedMetrics.processes && (
                <AdvancedChart 
                  data={historicalData} 
                  metric="processes" 
                  color="bg-indigo-500" 
                  unit="" 
                  title="Process Count" 
                />
              )}
            </div>
          )}

          {/* Data Info Footer */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>
                  <strong className="text-white">{historicalData.length}</strong> data points
                </span>
                <span>
                  Collection interval: <strong className="text-white">30s</strong>
                </span>
                {historicalData[0]?.aggregated && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                    Aggregated Data
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live collection active</span>
              </div>
            </div>
            
            {historicalData.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">First Sample:</span>
                    <br />
                    <span className="text-white font-mono">
                      {new Date(historicalData[0].timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Sample:</span>
                    <br />
                    <span className="text-white font-mono">
                      {new Date(historicalData[historicalData.length - 1].timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Time Span:</span>
                    <br />
                    <span className="text-white font-mono">
                      {((historicalData[historicalData.length - 1].timestamp - historicalData[0].timestamp) / (1000 * 60 * 60)).toFixed(1)} hours
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Storage:</span>
                    <br />
                    <span className="text-white font-mono">
                      {processId ? 'Process-specific' : 'System-wide'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}