'use client';

import { SystemInfo } from '@/types/pm2';
import { formatBytes, formatUptime } from '@/lib/utils';
import { Server, HardDrive, Cpu, Activity } from 'lucide-react';

interface SystemMetricsProps {
  systemInfo: SystemInfo;
}

export function SystemMetrics({ systemInfo }: SystemMetricsProps) {
  const memoryUsage = ((systemInfo.totalmem - systemInfo.freemem) / systemInfo.totalmem) * 100;
  const usedMemory = systemInfo.totalmem - systemInfo.freemem;
  
  const metrics = [
    {
      title: 'System Memory',
      icon: HardDrive,
      value: `${formatBytes(usedMemory)} / ${formatBytes(systemInfo.totalmem)}`,
      percentage: memoryUsage,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    },
    {
      title: 'CPU Cores',
      icon: Cpu,
      value: `${systemInfo.cpu_count} cores`,
      subtitle: `Load: ${systemInfo.loadavg.map(l => l.toFixed(2)).join(', ')}`,
      percentage: (systemInfo.loadavg[0] / systemInfo.cpu_count) * 100,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      title: 'System Uptime',
      icon: Activity,
      value: formatUptime(systemInfo.uptime),
      subtitle: `Host: ${systemInfo.hostname}`,
      percentage: null,
      color: 'bg-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    }
  ];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={index}
            className={`${metric.bgColor} ${metric.borderColor} border rounded-lg p-6 hover:bg-opacity-20 transition-all duration-200`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${metric.color}/20`}>
                  <Icon className={`h-5 w-5 text-white`} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-300">{metric.title}</h3>
                  <p className="text-lg font-semibold text-white mt-1">{metric.value}</p>
                  {metric.subtitle && (
                    <p className="text-xs text-gray-400 mt-1">{metric.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
            
            {metric.percentage !== null && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Usage</span>
                  <span>{metric.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`${metric.color} h-2 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}