'use client';

import { useState, useEffect } from 'react';
import { Link, Server, Globe, Activity, Copy, Trash2, Plus, ExternalLink } from 'lucide-react';
import { formatBytes, formatUptime } from '@/lib/utils';

interface LinkedServer {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  isActive: boolean;
  lastSeen: number;
  processCount: number;
  systemLoad: number;
  memoryUsage: number;
}

interface LinkedServersProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LinkedServers({ isOpen, onClose }: LinkedServersProps) {
  const [servers, setServers] = useState<LinkedServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [linkCommand, setLinkCommand] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  // Fetch linked servers
  const fetchServers = async () => {
    try {
      const response = await fetch('/api/pm2/link?action=list');
      const result = await response.json();
      if (result.success) {
        setServers(result.data.servers);
      }
    } catch (error) {
      console.error('Failed to fetch linked servers:', error);
    }
  };

  // Create new server link
  const createServerLink = async () => {
    if (!newServerName.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/pm2/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create-link',
          name: newServerName,
          hostname: newServerName
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setLinkCommand(result.data.linkCommand);
        setNewServerName('');
        fetchServers();
      } else {
        alert('Failed to create server link: ' + result.message);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove server link
  const removeServerLink = async (serverId: string) => {
    if (!confirm('Are you sure you want to remove this server link?')) return;
    
    try {
      const response = await fetch(`/api/pm2/link?id=${serverId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        fetchServers();
      } else {
        alert('Failed to remove server: ' + result.message);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Copy command to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  // Auto-refresh servers
  useEffect(() => {
    if (isOpen) {
      fetchServers();
      const interval = setInterval(fetchServers, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Link className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Linked Servers</h2>
              <p className="text-sm text-gray-400">
                Manage remote servers connected to this dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateLink(!showCreateLink)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Server</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Add Server Form */}
        {showCreateLink && (
          <div className="p-6 border-b border-gray-700 bg-gray-750">
            <h3 className="text-lg font-medium text-white mb-4">Add New Server</h3>
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="e.g., production-server-01"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && createServerLink()}
                />
              </div>
              <button
                onClick={createServerLink}
                disabled={!newServerName.trim() || isLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create Link'}
              </button>
            </div>
            
            {linkCommand && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-green-400">✅ Link Created!</h4>
                  <button
                    onClick={() => copyToClipboard(linkCommand)}
                    className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copySuccess || 'Copy'}</span>
                  </button>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  Run this command on your remote server:
                </p>
                <code className="block p-2 bg-gray-900 rounded text-xs text-green-400 font-mono overflow-x-auto">
                  {linkCommand}
                </code>
                <p className="text-xs text-gray-500 mt-2">
                  💡 The server will automatically appear below once connected
                </p>
              </div>
            )}
          </div>
        )}

        {/* Server List */}
        <div className="flex-1 overflow-y-auto p-6">
          {servers.length === 0 ? (
            <div className="text-center py-12">
              <Server className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Linked Servers</h3>
              <p className="text-gray-500 mb-4">
                Connect remote servers to monitor them from this dashboard
              </p>
              <button
                onClick={() => setShowCreateLink(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Server</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    server.isActive
                      ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                      : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        server.isActive ? 'bg-green-400' : 'bg-gray-500'
                      }`} />
                      <h3 className="font-medium text-white">{server.name}</h3>
                    </div>
                    <button
                      onClick={() => removeServerLink(server.id)}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Remove server"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span>{server.hostname}</span>
                    </div>
                    
                    {server.ip && (
                      <div className="flex items-center space-x-2 text-gray-300">
                        <span className="w-4 h-4 text-center text-gray-500">🌐</span>
                        <span>{server.ip}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Activity className="h-4 w-4 text-gray-500" />
                      <span>{server.processCount} processes</span>
                    </div>
                    
                    {server.isActive && (
                      <>
                        <div className="flex justify-between text-gray-300">
                          <span>Load:</span>
                          <span className={server.systemLoad > 2 ? 'text-red-400' : 'text-green-400'}>
                            {server.systemLoad.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-gray-300">
                          <span>Memory:</span>
                          <span className={server.memoryUsage > 80 ? 'text-red-400' : 'text-green-400'}>
                            {server.memoryUsage.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    )}
                    
                    <div className="pt-2 border-t border-gray-600">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Last seen:</span>
                        <span>
                          {server.lastSeen
                            ? new Date(server.lastSeen).toLocaleTimeString()
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {server.isActive && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <button className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-md text-sm transition-colors">
                        <ExternalLink className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-750">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {servers.length} total servers • {servers.filter(s => s.isActive).length} active
            </span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
                <span>Inactive</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}