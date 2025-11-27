'use client';

import { ProcessInfo, SystemInfo } from '@/types/pm2';
import { formatBytes } from '@/lib/utils';
import { Activity, Cpu, HardDrive, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface StatsOverviewProps {
  processes: ProcessInfo[];
  systemInfo: SystemInfo;
}

export function StatsOverview({ processes, systemInfo }: StatsOverviewProps) {
  const onlineProcesses = processes.filter(p => p.status === 'online').length;
  const stoppedProcesses = processes.filter(p => p.status === 'stopped').length;
  const erroredProcesses = processes.filter(p => p.status === 'errored').length;
  
  const totalCpu = processes.reduce((sum, p) => sum + p.monit.cpu, 0);
  const totalMemory = processes.reduce((sum, p) => sum + p.monit.memory, 0);
  
  const memoryUsage = ((systemInfo.totalmem - systemInfo.freemem) / systemInfo.totalmem) * 100;
  const avgLoad = systemInfo.loadavg[0];
  
  const stats = [
    {
      title: 'Online Processes',
      value: onlineProcesses,
      total: processes.length,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      title: 'Stopped/Errored',
      value: stoppedProcesses + erroredProcesses,
      total: processes.length,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20'
    },
    {
      title: 'CPU Usage',
      value: `${totalCpu.toFixed(1)}%`,
      subtitle: `Load: ${avgLoad.toFixed(2)}`,
      icon: Cpu,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      title: 'Memory Usage',
      value: formatBytes(totalMemory),
      subtitle: `System: ${memoryUsage.toFixed(1)}%`,
      icon: HardDrive,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    },
    {
      title: 'Total Restarts',
      value: processes.reduce((sum, p) => sum + p.restart_time, 0),
      subtitle: 'All processes',
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    },
    {
      title: 'CPU Cores',
      value: systemInfo.cpu_count,
      subtitle: `${formatBytes(systemInfo.totalmem)} RAM`,
      icon: Activity,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20'
    }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.bgColor} ${stat.borderColor} border rounded-lg p-4 hover:bg-opacity-20 transition-all duration-200`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-xs text-gray-400 font-medium">
                {typeof stat.total !== 'undefined' ? `${stat.value}/${stat.total}` : stat.value}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-300">{stat.title}</p>
              {stat.subtitle && (
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}