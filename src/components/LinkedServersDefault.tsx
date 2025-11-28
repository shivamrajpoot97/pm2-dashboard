'use client';

import { useState, useEffect } from 'react';
import { Link, Server, Globe, Activity, Copy, Trash2, Plus, ExternalLink } from 'lucide-react';
import { useAuthFetch } from '@/lib/useAuth';

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

export default function LinkedServers() {
  const [servers, setServers] = useState<LinkedServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [linkCommand, setLinkCommand] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const authFetch = useAuthFetch();

  // Fetch linked servers
  const fetchServers = async () => {
    try {
      const response = await authFetch('/api/pm2/link?action=list');
      const result = await response.json();
      if (result.success) {
        setServers(result.data.servers);
      } else {
        console.error('Failed to fetch servers:', result.error);
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
      const response = await authFetch('/api/pm2/link', {
        method: 'POST',
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
        alert('Failed to create server link: ' + (result.error || result.message));
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove server link
  const removeServerLink = async (serverId: string, serverName: string) => {
    if (!confirm(`Are you sure you want to remove server '${serverName}'?`)) return;
    
    try {
      const response = await authFetch(`/api/pm2/link?id=${serverId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        fetchServers();
        alert('Server removed successfully!');
      } else {
        alert('Failed to remove server: ' + (result.error || result.message));
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
    fetchServers();
    const interval = setInterval(fetchServers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Link className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Linked Servers</h2>
            <p className="text-sm text-gray-600">
              Remote servers connected to this dashboard
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateLink(!showCreateLink)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Server</span>
        </button>
      </div>

      {/* Add Server Form */}
      {showCreateLink && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Server</h3>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Server Name
              </label>
              <input
                type="text"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="e.g., production-server-01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-green-800">✅ Link Created!</h4>
                <button
                  onClick={() => copyToClipboard(linkCommand)}
                  className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copySuccess || 'Copy'}</span>
                </button>
              </div>
              <p className="text-sm text-green-700 mb-2">
                Run this command on your remote server:
              </p>
              <code className="block p-2 bg-gray-900 text-green-400 rounded text-xs font-mono overflow-x-auto">
                {linkCommand}
              </code>
              <p className="text-xs text-green-600 mt-2">
                💡 The server will automatically appear below once connected
              </p>
            </div>
          )}
        </div>
      )}

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Linked Servers</h3>
          <p className="text-gray-600 mb-4">
            Connect remote servers to monitor them from this dashboard
          </p>
          <button
            onClick={() => setShowCreateLink(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
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
                  ? 'bg-green-50 border-green-200 hover:bg-green-100'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    server.isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <h3 className="font-medium text-gray-900">{server.name}</h3>
                </div>
                <button
                  onClick={() => removeServerLink(server.id, server.name)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title={`Remove ${server.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <span>{server.hostname}</span>
                </div>
                
                {server.ip && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <span className="w-4 h-4 text-center text-gray-400">🌐</span>
                    <span>{server.ip}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <Activity className="h-4 w-4 text-gray-400" />
                  <span>{server.processCount} processes</span>
                </div>
                
                {server.isActive && (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>Load:</span>
                      <span className={server.systemLoad > 2 ? 'text-red-600' : 'text-green-600'}>
                        {server.systemLoad.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-gray-600">
                      <span>Memory:</span>
                      <span className={server.memoryUsage > 80 ? 'text-red-600' : 'text-green-600'}>
                        {server.memoryUsage.toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
                
                <div className="pt-2 border-t border-gray-200">
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
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-sm transition-colors">
                    <ExternalLink className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Footer */}
      {servers.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {servers.length} total servers • {servers.filter(s => s.isActive).length} active
            </span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span>Inactive</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
