'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth, useAuthFetch } from '@/lib/useAuth';
import { Eye, Download, Trash2, RotateCcw, Square } from 'lucide-react';

interface LogsPageProps {
  params: Promise<{ id: string }>;
}

export default function LogsPage({ params }: LogsPageProps) {
  const { isAuthenticated } = useAuth();
  const authFetch = useAuthFetch();
  const [processId, setProcessId] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [errorLogs, setErrorLogs] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'out' | 'error'>('out');
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setProcessId(resolvedParams.id);
    });
  }, [params]);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchLogs = async () => {
    if (!processId) return;
    
    try {
      const response = await authFetch(`/api/pm2/logs/${processId}`);
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data.out || 'No output logs available');
        setErrorLogs(result.data.error || 'No error logs available');
      } else {
        setLogs('Failed to load logs: ' + result.error);
        setErrorLogs('Failed to load error logs: ' + result.error);
      }
    } catch (error) {
      setLogs('Error fetching logs: ' + (error as Error).message);
      setErrorLogs('Error fetching error logs: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!processId || !confirm('Are you sure you want to clear logs for this process?')) return;
    
    try {
      const response = await authFetch(`/api/pm2/logs/${processId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        setLogs('');
        setErrorLogs('');
        alert('Logs cleared successfully');
      } else {
        alert('Failed to clear logs: ' + result.error);
      }
    } catch (error) {
      alert('Error clearing logs: ' + (error as Error).message);
    }
  };

  const downloadLogs = () => {
    const content = activeTab === 'out' ? logs : errorLogs;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `process-${processId}-${activeTab}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isAuthenticated || !processId) return;
    
    fetchLogs();
    
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        fetchLogs();
        setTimeout(scrollToBottom, 100);
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, processId, isLive]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4">Access Denied</h1>
          <p>Please authenticate to view logs</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Process {processId} - Logs</h1>
            <div className={`w-3 h-3 rounded-full ${
              isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`} />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center space-x-1 px-3 py-2 rounded transition-colors ${
                isLive 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isLive ? <Square className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{isLive ? 'Stop Live' : 'Live View'}</span>
            </button>
            
            <button
              onClick={fetchLogs}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={downloadLogs}
              className="flex items-center space-x-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            
            <button
              onClick={clearLogs}
              className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-4 mt-4">
          <button
            onClick={() => setActiveTab('out')}
            className={`px-4 py-2 rounded transition-colors ${
              activeTab === 'out'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Output Logs
          </button>
          <button
            onClick={() => setActiveTab('error')}
            className={`px-4 py-2 rounded transition-colors ${
              activeTab === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Error Logs
          </button>
        </div>
      </div>

      {/* Logs Content */}
      <div className="p-4 h-[calc(100vh-180px)]">
        <div className="bg-black rounded-lg p-4 h-full overflow-y-auto font-mono text-sm">
          <pre className="whitespace-pre-wrap text-green-400">
            {activeTab === 'out' ? logs : errorLogs}
          </pre>
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Process ID: {processId}</span>
          <span>{activeTab === 'out' ? 'Output' : 'Error'} Logs</span>
          <span>Auto-refresh: {isLive ? 'ON' : 'OFF'}</span>
        </div>
      </div>
    </div>
  );
}