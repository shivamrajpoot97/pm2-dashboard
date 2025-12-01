'use client';

import { useState, useEffect } from 'react';
import { useAuth, useAuthFetch } from '@/lib/useAuth';
import { Upload, ArrowLeft, GitBranch, Folder, Play, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DeployPage() {
  const { isAuthenticated } = useAuth();
  const authFetch = useAuthFetch();
  const [deployMethod, setDeployMethod] = useState<'git' | 'upload' | 'ecosystem'>('git');
  const [formData, setFormData] = useState({
    // Git deployment
    gitUrl: '',
    branch: 'main',
    appName: '',
    
    // Ecosystem file
    ecosystemContent: '',
    
    // Upload
    uploadedFile: null as File | null
  });
  const [deploying, setDeploying] = useState(false);
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const [deployResult, setDeployResult] = useState<any>(null);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeploying(true);
    setDeployLog([]);
    setDeployResult(null);

    const addLog = (message: string) => {
      setDeployLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    try {
      addLog('Starting deployment...');
      
      let deployData: any = {
        method: deployMethod
      };

      if (deployMethod === 'git') {
        deployData = {
          ...deployData,
          gitUrl: formData.gitUrl,
          branch: formData.branch,
          appName: formData.appName
        };
        addLog(`Cloning repository: ${formData.gitUrl}`);
        addLog(`Branch: ${formData.branch}`);
      } else if (deployMethod === 'ecosystem') {
        deployData = {
          ...deployData,
          ecosystemContent: formData.ecosystemContent
        };
        addLog('Processing ecosystem file...');
      }

      const response = await authFetch('/api/pm2/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deployData)
      });

      const result = await response.json();
      
      if (result.success) {
        addLog('✅ Deployment completed successfully!');
        setDeployResult(result.data);
      } else {
        addLog(`❌ Deployment failed: ${result.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setDeploying(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4">Access Denied</h1>
          <Link href="/" className="text-blue-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center space-x-2">
            <Upload className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold">Deploy Application</h1>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Deployment Method Selection */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Choose Deployment Method</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setDeployMethod('git')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                deployMethod === 'git'
                  ? 'border-indigo-500 bg-indigo-500/20'
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <GitBranch className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
              <h3 className="font-semibold">Git Repository</h3>
              <p className="text-sm text-gray-400">Deploy from Git URL</p>
            </button>
            
            <button
              onClick={() => setDeployMethod('upload')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                deployMethod === 'upload'
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <h3 className="font-semibold">File Upload</h3>
              <p className="text-sm text-gray-400">Upload ZIP/TAR file</p>
            </button>
            
            <button
              onClick={() => setDeployMethod('ecosystem')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                deployMethod === 'ecosystem'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <Folder className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <h3 className="font-semibold">Ecosystem File</h3>
              <p className="text-sm text-gray-400">PM2 ecosystem config</p>
            </button>
          </div>
        </div>

        {/* Deployment Form */}
        <form onSubmit={handleDeploy} className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Deployment Configuration</h2>
          
          {deployMethod === 'git' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Git Repository URL</label>
                <input
                  type="url"
                  value={formData.gitUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, gitUrl: e.target.value }))}
                  placeholder="https://github.com/username/repository.git"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Branch</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                    placeholder="main"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">App Name</label>
                  <input
                    type="text"
                    value={formData.appName}
                    onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
                    placeholder="my-app"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}
          
          {deployMethod === 'upload' && (
            <div>
              <label className="block text-sm font-medium mb-2">Upload Application File</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400 mb-2">Drop your ZIP or TAR file here, or click to browse</p>
                <input
                  type="file"
                  accept=".zip,.tar,.tar.gz"
                  onChange={(e) => setFormData(prev => ({ ...prev, uploadedFile: e.target.files?.[0] || null }))}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Select File
                </label>
                {formData.uploadedFile && (
                  <p className="mt-2 text-green-400">Selected: {formData.uploadedFile.name}</p>
                )}
              </div>
            </div>
          )}
          
          {deployMethod === 'ecosystem' && (
            <div>
              <label className="block text-sm font-medium mb-2">PM2 Ecosystem Configuration</label>
              <textarea
                value={formData.ecosystemContent}
                onChange={(e) => setFormData(prev => ({ ...prev, ecosystemContent: e.target.value }))}
                placeholder={`module.exports = {
  apps: [{
    name: 'my-app',
    script: './app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}`}
                rows={12}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-purple-500 focus:outline-none font-mono text-sm"
                required
              />
            </div>
          )}
          
          <div className="mt-6">
            <button
              type="submit"
              disabled={deploying}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-5 h-5" />
              <span>{deploying ? 'Deploying...' : 'Deploy Application'}</span>
            </button>
          </div>
        </form>

        {/* Deployment Log */}
        {(deployLog.length > 0 || deploying) && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Deployment Log</span>
            </h3>
            <div className="bg-black rounded p-4 font-mono text-sm max-h-60 overflow-y-auto">
              {deployLog.map((log, idx) => (
                <div key={idx} className="mb-1">
                  {log}
                </div>
              ))}
              {deploying && (
                <div className="text-yellow-400 animate-pulse">⏳ Processing...</div>
              )}
            </div>
          </div>
        )}
        
        {/* Deployment Result */}
        {deployResult && (
          <div className="mt-6 bg-green-800/20 border border-green-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-400 mb-4">✅ Deployment Successful</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Process ID:</strong> {deployResult.processId}</p>
              <p><strong>Status:</strong> {deployResult.status}</p>
              <p><strong>Memory:</strong> {deployResult.memory || 'N/A'}</p>
              <p><strong>CPU:</strong> {deployResult.cpu || 'N/A'}</p>
            </div>
            <div className="mt-4">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}