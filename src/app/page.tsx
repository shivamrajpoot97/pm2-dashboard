'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { StatsOverview } from '@/components/StatsOverview';
import { ProcessTable } from '@/components/ProcessTable';
import { MetricsChart } from '@/components/MetricsChart';
import { SystemMetrics } from '@/components/SystemMetrics';
import { LogsViewer } from '@/components/LogsViewer';
import { DeploymentModal } from '@/components/DeploymentModal';
import { LinkedServers } from '@/components/LinkedServers';
import { SystemProfiling } from '@/components/SystemProfiling';
import { ProcessDetailsModal } from '@/components/ProcessDetailsModal';
import { RealTimeMetrics } from '@/components/RealTimeMetrics';

import { PM2Data, ChartDataPoint } from '@/types/pm2';
import { generateChartData } from '@/lib/mockData';
import { Plus, Link, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [pm2Data, setPm2Data] = useState<PM2Data | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<{ id: number; name: string } | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showDeployment, setShowDeployment] = useState(false);
  const [showLinkedServers, setShowLinkedServers] = useState(false);
  const [showSystemProfiling, setShowSystemProfiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedServersCount, setLinkedServersCount] = useState(0);
  const [dataSource, setDataSource] = useState<'local' | 'linked'>('local');
  const [currentServerName, setCurrentServerName] = useState<string | null>(null);
  const [showProcessDetails, setShowProcessDetails] = useState(false);
  const [selectedProcessForDetails, setSelectedProcessForDetails] = useState<number | null>(null);
  
  // Fetch real PM2 data
  const fetchPM2Data = async () => {
    try {
      const response = await fetch('/api/pm2');
      const result = await response.json();
      
      if (result.success) {
        setPm2Data(result.data);
        setDataSource(result.data.source);
        setCurrentServerName(result.data.serverName || null);
        setIsConnected(true);
        setError(null);
        
        // Update chart data with real CPU and memory usage
        const totalCpu = result.data.processes.reduce((sum: number, p: any) => sum + p.monit.cpu, 0);
        const totalMemory = result.data.processes.reduce((sum: number, p: any) => sum + p.monit.memory, 0);
        const memoryPercent = result.data.system.totalmem > 0 
          ? (totalMemory / result.data.system.totalmem) * 100 
          : 0;
        
        const newPoint: ChartDataPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          memory: memoryPercent,
          cpu: totalCpu,
          timestamp: Date.now()
        };
        
        setChartData(prev => [...prev.slice(-99), newPoint]);
      } else {
        setError(result.error || 'Failed to fetch PM2 data');
        setIsConnected(false);
      }
    } catch (err: any) {
      setError('Connection failed: ' + err.message);
      setIsConnected(false);
      console.error('Failed to fetch PM2 data:', err);
    }
  };

  // Fetch linked servers count
  const fetchLinkedServersCount = async () => {
    try {
      const response = await fetch('/api/pm2/link');
      const result = await response.json();
      if (result.success) {
        setLinkedServersCount(result.data.summary.active);
      }
    } catch (error) {
      // Silently handle error - linked servers is optional
    }
  };

  // Initial data load
  useEffect(() => {
    fetchPM2Data();
    fetchLinkedServersCount();
    // Initialize chart with some historical mock data
    setChartData(generateChartData(1)); // 1 hour of data
  }, []);

  // Set up real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPM2Data();
      fetchLinkedServersCount();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchPM2Data(), fetchLinkedServersCount()]);
    setIsRefreshing(false);
  };

  const handleProcessAction = async (action: string, processId: number, options?: any) => {
    const process = pm2Data?.processes.find(p => p.pm_id === processId);
    
    try {
      switch (action) {
        case 'start':
        case 'stop':
        case 'restart':
        case 'delete':
        case 'reload':
        case 'scale':
        case 'reset':
        case 'flush':
          const response = await fetch('/api/pm2', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, processId, options })
          });
          
          const result = await response.json();
          
          if (result.success) {
            console.log(`✅ ${action} executed successfully on process ${processId}`);
            // Refresh data after action
            setTimeout(() => fetchPM2Data(), 1000);
          } else {
            console.error(`❌ Failed to ${action} process ${processId}:`, result.error);
            alert(`Failed to ${action} process: ${result.message}`);
          }
          break;
          
        case 'logs':
          if (process) {
            setSelectedProcess({ id: processId, name: process.name });
            setShowLogs(true);
          }
          break;
          
        case 'details':
          setSelectedProcessForDetails(processId);
          setShowProcessDetails(true);
          break;
          
        default:
          console.log(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error(`Error executing ${action}:`, error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeploy = () => {
    // Refresh data after deployment
    fetchPM2Data();
  };

  // Loading state
  if (!pm2Data && !error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Connecting to PM2...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !pm2Data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Connection Error</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <div className="space-y-2 text-sm text-gray-400 text-left">
              <p>Possible solutions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Make sure PM2 is installed: <code className="bg-gray-800 px-1 rounded">npm install -g pm2</code></li>
                <li>Check if PM2 daemon is running: <code className="bg-gray-800 px-1 rounded">pm2 status</code></li>
                <li>Start some processes: <code className="bg-gray-800 px-1 rounded">pm2 start app.js</code></li>
              </ul>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
              >
                Retry Connection
              </button>
              <button
                onClick={() => setShowDeployment(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Deploy App</span>
              </button>
              <button
                onClick={() => setShowLinkedServers(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <Link className="h-4 w-4" />
                <span>Link Server</span>
              </button>
              <button
                onClick={() => setShowSystemProfiling(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <TrendingUp className="h-4 w-4" />
                <span>System Profiling</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {error && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-6 py-2">
          <p className="text-yellow-400 text-sm">
            ⚠️ Connection issues: {error}
          </p>
        </div>
      )}
      
      <Header 
        systemInfo={pm2Data!.system}
        isConnected={isConnected}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      
      <main className="p-6 space-y-6">
        {/* Real-time Metrics */}
        {/* Action Bar */}
        {/* Server Status Banner */}
        {dataSource === 'linked' && currentServerName && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-purple-400 font-semibold">Connected to Remote Server</span>
              </div>
              <div className="text-white font-medium">{currentServerName}</div>
              <div className="text-gray-400 text-sm">({pm2Data!.system.hostname})</div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Process Overview</h1>
            <p className="text-gray-400 mt-1">
              {pm2Data!.processes.length} {dataSource === 'linked' ? `processes on ${currentServerName}` : 'local processes'}
              {linkedServersCount > 0 && ` • ${linkedServersCount} linked servers`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowLinkedServers(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium transition-colors relative"
            >
              <Link className="h-4 w-4" />
              <span>Linked Servers</span>
              {linkedServersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {linkedServersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowDeployment(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Deploy App</span>
            </button>
            <button
              onClick={() => setShowSystemProfiling(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md text-sm font-medium transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              <span>System Profiling</span>
            </button>
          </div>
        </div>
        
        <StatsOverview 
          processes={pm2Data!.processes}
          systemInfo={pm2Data!.system}
        />
        {/* Charts and System Metrics */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <MetricsChart 
            data={chartData}
            title="Resource Usage Over Time"
            type="area"
          />
          <div className="space-y-6">
            <SystemMetrics systemInfo={pm2Data!.system} />
          </div>
        </div>
        
        {/* Process Table */}
        <ProcessTable 
          processes={pm2Data!.processes}
          onAction={handleProcessAction}
        />
      </main>

      {/* Linked Servers Modal */}
      <LinkedServers
        isOpen={showLinkedServers}
        onClose={() => setShowLinkedServers(false)}
      />

      {/* Deployment Modal */}
      <DeploymentModal
        isOpen={showDeployment}
        onClose={() => setShowDeployment(false)}
        onDeploy={handleDeploy}
      />

      {/* Logs Viewer Modal */}
      <LogsViewer
        processId={selectedProcess?.id}
        processName={selectedProcess?.name}
        isOpen={showLogs}
        onClose={() => {
          setShowLogs(false);
          setSelectedProcess(null);
        }}
      />

      {/* System Profiling Modal */}
      <SystemProfiling
        isOpen={showSystemProfiling}
        onClose={() => setShowSystemProfiling(false)}
      />

      {/* Process Details Modal */}
      <ProcessDetailsModal
        processId={selectedProcessForDetails}
        isOpen={showProcessDetails}
        onClose={() => {
          setShowProcessDetails(false);
          setSelectedProcessForDetails(null);
        }}
        onAction={handleProcessAction}
      />
    </div>
  );
}
