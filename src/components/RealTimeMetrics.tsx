'use client';

import { useState, useEffect } from 'react';
import { Activity, Cpu, MemoryStick, HardDrive, Wifi } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface SystemMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percent: number;
  };
  disk: {
    used: number;
    total: number;
    percent: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  load: number[];
}

export function RealTimeMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/pm2/system');
        const result = await response.json();
        
        if (result.success) {
          // Transform the data to match our interface
          const systemData = result.data;
          setMetrics({
            cpu: systemData.loadavg?.[0] * 10 || 0, // Approximate CPU from load average
            memory: {
              used: systemData.totalmem - systemData.freemem,
              total: systemData.totalmem,
              percent: ((systemData.totalmem - systemData.freemem) / systemData.totalmem) * 100
            },
            disk: {
              used: 50 * 1024 * 1024 * 1024, // Mock data
              total: 100 * 1024 * 1024 * 1024, // Mock data  
              percent: 50 // Mock data
            },
            network: {
              rx: Math.random() * 1024 * 1024, // Mock data
              tx: Math.random() * 1024 * 1024  // Mock data
            },
            load: systemData.loadavg || [0, 0, 0]
          });
          setIsConnected(true);
        }
      } catch (error) {
        setIsConnected(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Real-time System Metrics</h3>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU Usage */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Cpu className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-400">CPU Load</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.cpu.toFixed(1)}%</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <MemoryStick className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-400">Memory Usage</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.memory.percent.toFixed(1)}%</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(metrics.memory.percent, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-400">
            {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
          </div>
        </div>

        {/* Disk Usage */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-gray-400">Disk Usage</span>
          </div>
          <div className="text-2xl font-bold text-white">{metrics.disk.percent.toFixed(1)}%</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(metrics.disk.percent, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-400">
            {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
          </div>
        </div>

        {/* Network Activity */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-gray-400">Network I/O</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">↓ RX</span>
              <span className="text-white font-medium">{formatBytes(metrics.network.rx)}/s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">↑ TX</span>
              <span className="text-white font-medium">{formatBytes(metrics.network.tx)}/s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Load Average */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">Load Average</span>
          <div className="flex space-x-4 text-sm text-white">
            <span>1m: <span className="font-mono">{metrics.load[0]?.toFixed(2) || '0.00'}</span></span>
            <span>5m: <span className="font-mono">{metrics.load[1]?.toFixed(2) || '0.00'}</span></span>
            <span>15m: <span className="font-mono">{metrics.load[2]?.toFixed(2) || '0.00'}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}