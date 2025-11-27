'use client';

import { useState } from 'react';
import { X, Plus, Upload, FileText, Rocket, Settings } from 'lucide-react';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: () => void;
}

interface AppTemplate {
  type: string;
  name: string;
  description: string;
  defaultScript: string;
  defaultPort: number;
}

export function DeploymentModal({ isOpen, onClose, onDeploy }: DeploymentModalProps) {
  const [activeTab, setActiveTab] = useState<'simple' | 'ecosystem' | 'package' | 'templates'>('simple');
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);

  // Simple deployment form state
  const [simpleConfig, setSimpleConfig] = useState({
    name: '',
    script: '',
    cwd: '',
    instances: 1,
    env: {}
  });

  // Ecosystem config state
  const [ecosystemConfig, setEcosystemConfig] = useState({
    apps: [{
      name: '',
      script: '',
      cwd: '',
      instances: 1,
      exec_mode: 'fork' as 'fork' | 'cluster',
      env: {},
      max_memory_restart: '1G',
      autorestart: true,
      watch: false
    }]
  });

  // Package.json config
  const [packageConfig, setPackageConfig] = useState({
    path: '',
    name: '',
    script: 'start',
    instances: 1
  });

  // Template config
  const [templateConfig, setTemplateConfig] = useState({
    type: 'express',
    name: '',
    port: 3000,
    instances: 1,
    env: {}
  });

  // Fetch templates on mount
  useState(() => {
    if (isOpen) {
      fetchTemplates();
    }
  });

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/pm2/deploy?action=templates');
      const result = await response.json();
      if (result.success) {
        setTemplates(result.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const deployApp = async (action: string, config: any) => {
    setIsDeploying(true);
    setDeploymentResult(null);

    try {
      const response = await fetch('/api/pm2/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, config })
      });

      const result = await response.json();
      setDeploymentResult(result);

      if (result.success) {
        setTimeout(() => {
          onDeploy();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      setDeploymentResult({
        success: false,
        error: 'Deployment failed',
        message: error.message
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSimpleDeploy = () => {
    deployApp('start-simple', simpleConfig);
  };

  const handleEcosystemDeploy = () => {
    deployApp('start-ecosystem', ecosystemConfig);
  };

  const handlePackageDeploy = () => {
    deployApp('start-from-package-json', packageConfig);
  };

  const handleTemplateDeploy = () => {
    deployApp('quick-start', templateConfig);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Rocket className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Deploy Application</h2>
              <p className="text-sm text-gray-400">Start new processes with PM2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          {[
            { key: 'simple', label: 'Simple', icon: Plus },
            { key: 'ecosystem', label: 'Ecosystem', icon: Settings },
            { key: 'package', label: 'Package.json', icon: FileText },
            { key: 'templates', label: 'Templates', icon: Upload }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === key
                  ? 'text-blue-400 border-blue-400 bg-blue-500/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Simple Deployment */}
          {activeTab === 'simple' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Quick Start</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Process Name *
                  </label>
                  <input
                    type="text"
                    value={simpleConfig.name}
                    onChange={(e) => setSimpleConfig({ ...simpleConfig, name: e.target.value })}
                    placeholder="my-app"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Script Path *
                  </label>
                  <input
                    type="text"
                    value={simpleConfig.script}
                    onChange={(e) => setSimpleConfig({ ...simpleConfig, script: e.target.value })}
                    placeholder="./app.js or npm start"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Working Directory
                  </label>
                  <input
                    type="text"
                    value={simpleConfig.cwd}
                    onChange={(e) => setSimpleConfig({ ...simpleConfig, cwd: e.target.value })}
                    placeholder="/path/to/your/app"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Instances
                  </label>
                  <input
                    type="number"
                    value={simpleConfig.instances}
                    onChange={(e) => setSimpleConfig({ ...simpleConfig, instances: parseInt(e.target.value) })}
                    min="1"
                    max="16"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSimpleDeploy}
                  disabled={!simpleConfig.name || !simpleConfig.script || isDeploying}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
                >
                  {isDeploying ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
            </div>
          )}

          {/* Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Application Templates</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {templates.map((template) => (
                  <div
                    key={template.type}
                    onClick={() => setTemplateConfig({ ...templateConfig, type: template.type })}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      templateConfig.type === template.type
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                    }`}
                  >
                    <h4 className="font-medium text-white">{template.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                    <p className="text-xs text-gray-500 mt-2 font-mono">{template.defaultScript}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Process Name *
                  </label>
                  <input
                    type="text"
                    value={templateConfig.name}
                    onChange={(e) => setTemplateConfig({ ...templateConfig, name: e.target.value })}
                    placeholder="my-app"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={templateConfig.port}
                    onChange={(e) => setTemplateConfig({ ...templateConfig, port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTemplateDeploy}
                  disabled={!templateConfig.name || isDeploying}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
                >
                  {isDeploying ? 'Deploying...' : 'Deploy with Template'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Deployment Result */}
        {deploymentResult && (
          <div className={`p-4 border-t border-gray-700 ${
            deploymentResult.success ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}>
            <div className={`text-sm ${
              deploymentResult.success ? 'text-green-400' : 'text-red-400'
            }`}>
              {deploymentResult.success ? '✅' : '❌'} {deploymentResult.message}
            </div>
            {deploymentResult.output && (
              <pre className="text-xs text-gray-400 mt-2 font-mono">
                {deploymentResult.output}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}