'use client';

import { Activity, Server, RefreshCw } from 'lucide-react';
import { SystemInfo } from '@/types/pm2';
import { formatBytes, formatUptime } from '@/lib/utils';

interface HeaderProps {
  systemInfo: SystemInfo;
  isConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function Header({ systemInfo, isConnected, onRefresh, isRefreshing }: HeaderProps) {
  const memoryUsage = ((systemInfo.totalmem - systemInfo.freemem) / systemInfo.totalmem) * 100;
  
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">PM2 Dashboard</h1>
              <p className="text-sm text-gray-400">Process Manager 2.0</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-sm text-gray-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Server Info */}
          <div className="flex items-center space-x-4 text-sm text-gray-300">
            <div className="flex items-center space-x-1">
              <Server className="h-4 w-4" />
              <span>{systemInfo.hostname}</span>
            </div>
            <div>
              Uptime: {formatUptime(systemInfo.uptime)}
            </div>
            <div>
              Memory: {memoryUsage.toFixed(1)}%
            </div>
            <div>
              Load: {systemInfo.loadavg.map(load => load.toFixed(2)).join(', ')}
            </div>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}