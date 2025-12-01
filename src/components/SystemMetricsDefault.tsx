'use client';

import { useState, useEffect } from 'react';
import { useAuthFetch } from '@/lib/useAuth';
import { SystemMetrics } from './SystemMetrics';
import { SystemInfo } from '@/types/pm2';

export default function SystemMetricsDefault() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const authFetch = useAuthFetch();

  const fetchSystemInfo = async () => {
    try {
      const response = await authFetch('/api/pm2/system');
      const result = await response.json();
      
      if (result.success) {
        setSystemInfo(result.data.system);
      } else {
        console.error('Failed to fetch system info:', result.error);
      }
    } catch (error) {
      console.error('Error fetching system info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-2 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className="bg-red-800/20 border border-red-500/30 rounded-lg p-6">
        <p className="text-red-400">Failed to load system information</p>
      </div>
    );
  }

  return <SystemMetrics systemInfo={systemInfo} />;
}