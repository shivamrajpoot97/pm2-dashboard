'use client';

import { ProcessInfo } from '@/types/pm2';
import { formatBytes, formatUptime, getStatusBadgeColor, formatCpuUsage } from '@/lib/utils';
import { Play, Square, RotateCcw, Trash2, Eye, Settings, GitBranch, GitCommit, Activity } from 'lucide-react';

interface ProcessTableProps {
  processes: ProcessInfo[];
  onAction?: (action: string, processId: number) => void;
}

export function ProcessTable({ processes, onAction }: ProcessTableProps) {
  const handleAction = (action: string, processId: number) => {
    onAction?.(action, processId);
  };
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Processes</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-750">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">CPU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Memory</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">PID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Uptime</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Restarts</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Git Info</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {processes.map((process) => {
              const uptime = (Date.now() - process.pm2_env.pm_uptime) / 1000;
              const gitInfo = process.pm2_env.versioning;
              
              return (
                <tr key={process.pm_id} className="hover:bg-gray-750/50 transition-colors">
                  {/* ID */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-300">{process.pm_id}</span>
                  </td>
                  {/* Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{process.name}</span>
                      <span className="text-xs text-gray-400">{process.pm2_env.pm_exec_path.split('/').pop()}</span>
                    </div>
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                        process.status
                      )}`}
                    >
                      {process.status}
                    </span>
                  </td>
                  {/* CPU */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="text-sm text-gray-300">{formatCpuUsage(process.monit.cpu)}</div>
                        <div className="w-16 bg-gray-700 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(process.monit.cpu, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Memory */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="text-sm text-gray-300">{formatBytes(process.monit.memory)}</div>
                        <div className="w-16 bg-gray-700 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                (process.monit.memory / (512 * 1024 * 1024)) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* PID */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {process.status === 'online' ? process.pid : '-'}
                  </td>
                  {/* Uptime */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {process.status === 'online' ? formatUptime(uptime) : '-'}
                  </td>
                  
                  {/* Restarts */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-300">{process.restart_time}</span>
                      {process.pm2_env.unstable_restarts > 0 && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          {process.pm2_env.unstable_restarts} unstable
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Git Info Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {gitInfo ? (
                      <div className="flex flex-col space-y-1 min-w-48">
                        {/* Repository name and URL */}
                        {gitInfo.repoName && (
                          <div
                            className="text-xs text-blue-400 font-medium truncate"
                            title={gitInfo.url}
                          >
                            📦 {gitInfo.repoName}
                          </div>
                        )}

                        {/* Branch info */}
                        {gitInfo.branch && (
                          <div className="flex items-center space-x-1 text-xs">
                            <GitBranch className="h-3 w-3 text-green-400" />
                            <span className="text-green-400 font-medium">{gitInfo.branch}</span>
                            {gitInfo.ahead && (
                              <span className="bg-orange-500/20 text-orange-400 px-1 py-0.5 rounded text-xs">
                                ahead
                              </span>
                            )}
                            {gitInfo.unstaged && (
                              <span className="bg-red-500/20 text-red-400 px-1 py-0.5 rounded text-xs">
                                dirty
                              </span>
                            )}
                          </div>
                        )}

                        {/* Commit info */}
                        {gitInfo.commit?.short && (
                          <div className="flex items-center space-x-1 text-xs">
                            <GitCommit className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-400 font-mono">
                              {gitInfo.commit.short}
                            </span>
                            {gitInfo.commit.date && (
                              <span className="text-gray-500">• {gitInfo.commit.date}</span>
                            )}
                          </div>
                        )}

                        {/* Commit message */}
                        {gitInfo.commit?.message && (
                          <div
                            className="text-xs text-gray-300 truncate max-w-48"
                            title={gitInfo.commit.message}
                          >
                            💬 {gitInfo.commit.message}
                          </div>
                        )}

                        {/* Author */}
                        {gitInfo.commit?.author && (
                          <div
                            className="text-xs text-gray-400 truncate"
                            title={`${gitInfo.commit.author}${
                              gitInfo.commit.email ? ` <${gitInfo.commit.email}>` : ''
                            }`}
                          >
                            👤 {gitInfo.commit.author}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">No Git info</span>
                    )}
                  </td>
                  
                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {process.status === 'online' ? (
                        <button
                          onClick={() => handleAction('stop', process.pm_id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Stop"
                        >
                          <Square className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction('start', process.pm_id)}
                          className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                          title="Start"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleAction('restart', process.pm_id)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                        title="Restart"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleAction('logs', process.pm_id)}
                        className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                        title="View Logs"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleAction('delete', process.pm_id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleAction('details', process.pm_id)}
                        className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                        title="Details"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleAction('profiling', process.pm_id)}
                        className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
                        title="App Profiling"
                      >
                        <Activity className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}