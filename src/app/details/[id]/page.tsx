'use client';

import { useState, useEffect } from 'react';
import { useAuth, useAuthFetch } from '@/lib/useAuth';
import { ArrowLeft, Activity, Settings, RotateCcw, Square, Play, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ProcessInfo } from '@/types/pm2';
import { formatBytes, formatUptime, getStatusBadgeColor } from '@/lib/utils';

interface DetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function DetailsPage({ params }: DetailsPageProps) {
  const { isAuthenticated } = useAuth();
  const authFetch = useAuthFetch();
  const [processId, setProcessId] = useState<string>('');
  const [process, setProcess] = useState<ProcessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setProcessId(resolvedParams.id);
    });
  }, [params]);

  const fetchProcessDetails = async () => {
    if (!processId) return;
    
    try {
      setLoading(true);
      const response = await authFetch(`/api/pm2/${processId}`);
      const result = await response.json();
      
      if (result.success) {
        setProcess(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch process details');
      }
    } catch (err: any) {
      setError('Error fetching process details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!processId) return;
    
    try {
      const response = await authFetch(`/api/pm2/${processId}`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh process details after action
        await fetchProcessDetails();
      } else {
        alert(`Failed to ${action} process: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error performing ${action}: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !processId) return;
    
    fetchProcessDetails();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchProcessDetails, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, processId]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4">Access Denied</h1>
          <p>Please authenticate to view process details</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading process details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4 text-red-400">Error</h1>
          <p>{error}</p>
          <Link href="/" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors">
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4">Process Not Found</h1>
          <p>Process with ID {processId} was not found</p>
          <Link href="/" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors">
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const uptime = (Date.now() - process.pm2_env.pm_uptime) / 1000;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="p-2 hover:bg-gray-700 rounded transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">{process.name}</h1>
              <p className="text-gray-400">Process ID: {process.pm_id}</p>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                process.status
              )}`}
            >
              {process.status}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {process.status === 'online' ? (
              <button
                onClick={() => handleAction('stop')}
                className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={() => handleAction('start')}
                className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start</span>
              </button>
            )}
            
            <button
              onClick={() => handleAction('restart')}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart</span>
            </button>
            
            <Link
              href={`/logs/${processId}`}
              className="flex items-center space-x-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>Logs</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-sm">Name</label>
              <p className="text-white font-medium">{process.name}</p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm">Process ID</label>
              <p className="text-white font-medium">{process.pm_id}</p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm">PID</label>
              <p className="text-white font-medium">{process.status === 'online' ? process.pid : 'N/A'}</p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm">Status</label>
              <p className="text-white font-medium">{process.status}</p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm">Uptime</label>
              <p className="text-white font-medium">{process.status === 'online' ? formatUptime(uptime) : 'N/A'}</p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm">Restarts</label>
              <p className="text-white font-medium">{process.restart_time}</p>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-1">CPU Usage</label>
              <p className="text-2xl font-bold text-blue-400">{process.monit.cpu.toFixed(1)}%</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-1">Memory Usage</label>
              <p className="text-2xl font-bold text-purple-400">{formatBytes(process.monit.memory)}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-1">Restarts</label>
              <p className="text-2xl font-bold text-green-400">{process.restart_time}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-1">PID</label>
              <p className="text-2xl font-bold text-yellow-400">{process.status === 'online' ? process.pid : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Environment Configuration */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Environment Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm">Executable Path</label>
              <p className="text-white font-mono text-sm break-all">{process.pm2_env.pm_exec_path}</p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm">Working Directory</label>
              <p className="text-white font-mono text-sm break-all">{process.pm2_env.pm_cwd}</p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm">Interpreter</label>
              <p className="text-white font-medium">{process.pm2_env.exec_interpreter || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm">Username</label>
              <p className="text-white font-medium">{process.pm2_env.username || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Git Information */}
        {process.pm2_env.versioning && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Git Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm">Repository</label>
                <p className="text-white font-medium">{process.pm2_env.versioning.repoName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm">Branch</label>
                <p className="text-white font-medium">{process.pm2_env.versioning.branch || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm">Commit</label>
                <p className="text-white font-mono text-sm">{process.pm2_env.versioning.commit?.short || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm">Author</label>
                <p className="text-white font-medium">{process.pm2_env.versioning.commit?.author || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}