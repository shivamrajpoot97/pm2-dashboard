'use client';

import { useState } from 'react';
import { Play, Square, RotateCcw, Trash2, Scale, GitBranch, Download, Upload } from 'lucide-react';

interface ProcessActionsProps {
  processId: number;
  processName: string;
  status: string;
  instances: number;
  onAction: (action: string, processId: number, options?: any) => void;
}

export function ProcessActions({ processId, processName, status, instances, onAction }: ProcessActionsProps) {
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scaleValue, setScaleValue] = useState(instances);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: string, options?: any) => {
    setIsLoading(action);
    try {
      await onAction(action, processId, options);
    } finally {
      setIsLoading(null);
    }
  };

  const handleScale = async () => {
    await handleAction('scale', { instances: scaleValue });
    setShowScaleModal(false);
  };

  return (
    <>
      <div className="flex items-center space-x-1">
        {/* Basic Actions */}
        {status === 'online' ? (
          <button
            onClick={() => handleAction('stop')}
            disabled={isLoading === 'stop'}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
            title="Stop"
          >
            {isLoading === 'stop' ? (
              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        ) : (
          <button
            onClick={() => handleAction('start')}
            disabled={isLoading === 'start'}
            className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
            title="Start"
          >
            {isLoading === 'start' ? (
              <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        )}

        <button
          onClick={() => handleAction('restart')}
          disabled={isLoading === 'restart'}
          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors disabled:opacity-50"
          title="Restart"
        >
          {isLoading === 'restart' ? (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={() => handleAction('reload')}
          disabled={isLoading === 'reload'}
          className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
          title="Graceful Reload"
        >
          {isLoading === 'reload' ? (
            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <GitBranch className="h-4 w-4" />
          )}
        </button>

        {/* Advanced Actions */}
        <button
          onClick={() => setShowScaleModal(true)}
          className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
          title="Scale Instances"
        >
          <Scale className="h-4 w-4" />
        </button>

        <button
          onClick={() => handleAction('delete')}
          disabled={isLoading === 'delete'}
          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
          title="Delete"
        >
          {isLoading === 'delete' ? (
            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Scale Modal */}
      {showScaleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowScaleModal(false)} />
            
            <div className="relative bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Scale Process</h3>
              <p className="text-gray-400 text-sm mb-4">
                Adjust the number of instances for <span className="font-medium text-white">{processName}</span>
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Number of Instances
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={scaleValue}
                  onChange={(e) => setScaleValue(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: {instances} instances
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowScaleModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScale}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Scale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}