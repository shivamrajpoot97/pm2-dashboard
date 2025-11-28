'use client';

import { useState, useEffect } from 'react';
import { useAuthFetch } from '@/lib/useAuth';
import { formatBytes } from '@/lib/utils';
import { Activity, Cpu, HardDrive, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface ProcessInfo {
  status: string;
  monit: { cpu: number; memory: number };
  restart_time: number;
}

interface SystemInfo {
  totalmem: number;
  freemem: number;
  loadavg: number[];
  cpu_count: number;
}

export default function StatsOverview() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const authFetch = useAuthFetch();

  const fetchData = async () => {
    try {
      const response = await authFetch('/api/pm2');
      const result = await response.json();
      
      if (result.success) {
        setProcesses(result.data.processes || []);
        setSystemInfo(result.data.system);
      } else {
        console.error('Failed to fetch PM2 data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800">Failed to load system information</p>
      </div>
    );
  }

  const onlineProcesses = processes.filter(p => p.status === 'online').length;
  const stoppedProcesses = processes.filter(p => p.status === 'stopped').length;
  const erroredProcesses = processes.filter(p => p.status === 'errored').length;
  
  const totalCpu = processes.reduce((sum, p) => sum + (p.monit?.cpu || 0), 0);
  const totalMemory = processes.reduce((sum, p) => sum + (p.monit?.memory || 0), 0);
  
  const memoryUsage = ((systemInfo.totalmem - systemInfo.freemem) / systemInfo.totalmem) * 100;
  const avgLoad = systemInfo.loadavg?.[0] || 0;
  
  const stats = [
    {
      title: 'Online Processes',
      value: onlineProcesses,
      total: processes.length,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Stopped/Errored',
      value: stoppedProcesses + erroredProcesses,
      total: processes.length,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      title: 'CPU Usage',
      value: `${totalCpu.toFixed(1)}%`,
      subtitle: `Load: ${avgLoad.toFixed(2)}`,
      icon: Cpu,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Memory Usage',
      value: formatBytes(totalMemory),
      subtitle: `System: ${memoryUsage.toFixed(1)}%`,
      icon: HardDrive,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Total Restarts',
      value: processes.reduce((sum, p) => sum + (p.restart_time || 0), 0),
      subtitle: 'All processes',
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'CPU Cores',
      value: systemInfo.cpu_count,
      subtitle: `${formatBytes(systemInfo.totalmem)} RAM`,
      icon: Activity,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.bgColor} ${stat.borderColor} border rounded-lg p-4 hover:shadow-md transition-all duration-200`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-xs text-gray-600 font-medium">
                {typeof stat.total !== 'undefined' ? `${stat.value}/${stat.total}` : stat.value}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-900">{stat.title}</p>
              {stat.subtitle && (
                <p className="text-xs text-gray-600">{stat.subtitle}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
