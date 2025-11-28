'use client';

import { useMemo } from 'react';
import { formatBytes } from '@/lib/utils';

interface ProfilingChartProps {
  data: any[];
  type: 'cpu' | 'memory';
  height?: number;
}

export function ProfilingChart({ data, type, height = 200 }: ProfilingChartProps) {
  const { chartData, maxValue, minValue } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], maxValue: 0, minValue: 0 };
    }

    const values = data.map(d => {
      if (type === 'cpu') {
        return d.value || 0;
      } else {
        return d.heapUsed || 0;
      }
    });

    const max = Math.max(...values);
    const min = Math.min(...values);
    
    const chartData = data.map((d, index) => {
      const value = type === 'cpu' ? (d.value || 0) : (d.heapUsed || 0);
      const normalizedValue = max > min ? ((value - min) / (max - min)) : 0;
      
      return {
        x: (index / (data.length - 1)) * 100,
        y: height - (normalizedValue * (height - 40)) - 20,
        value,
        timestamp: d.timestamp
      };
    });

    return { chartData, maxValue: max, minValue: min };
  }, [data, type, height]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-800 rounded border">
        <p className="text-gray-400">No profiling data available</p>
      </div>
    );
  }

  const pathData = chartData.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${point.x} ${point.y}`;
  }).join(' ');

  const areaPath = `${pathData} L ${chartData[chartData.length - 1]?.x || 0} ${height} L 0 ${height} Z`;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-white font-medium">
          {type === 'cpu' ? 'CPU Usage Over Time' : 'Memory Usage Over Time'}
        </h4>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full ${
              type === 'cpu' ? 'bg-blue-400' : 'bg-purple-400'
            }`} />
            <span className="text-gray-300">
              Peak: {type === 'cpu' ? `${maxValue.toFixed(2)}%` : formatBytes(maxValue)}
            </span>
          </div>
          <div className="text-gray-400">
            {data.length} samples
          </div>
        </div>
      </div>
      
      <div className="relative">
        <svg width="100%" height={height} className="border border-gray-700 rounded">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#374151" strokeOpacity="0.3" strokeWidth="0.5"/>
            </pattern>
            <linearGradient id={`gradient-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={type === 'cpu' ? '#3B82F6' : '#A855F7'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={type === 'cpu' ? '#3B82F6' : '#A855F7'} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Area chart */}
          {chartData.length > 1 && (
            <path
              d={areaPath}
              fill={`url(#gradient-${type})`}
              stroke="none"
            />
          )}
          
          {/* Line chart */}
          {chartData.length > 1 && (
            <path
              d={pathData}
              fill="none"
              stroke={type === 'cpu' ? '#3B82F6' : '#A855F7'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Data points */}
          {chartData.map((point, index) => (
            <g key={index}>
              <circle
                cx={`${point.x}%`}
                cy={point.y}
                r="3"
                fill={type === 'cpu' ? '#3B82F6' : '#A855F7'}
                className="hover:r-4 transition-all cursor-pointer"
              >
                <title>
                  {new Date(point.timestamp).toLocaleTimeString()}: {' '}
                  {type === 'cpu' ? `${point.value.toFixed(2)}%` : formatBytes(point.value)}
                </title>
              </circle>
            </g>
          ))}
          
          {/* Y-axis labels */}
          <text x="10" y="15" fill="#9CA3AF" fontSize="10">
            {type === 'cpu' ? `${maxValue.toFixed(1)}%` : formatBytes(maxValue)}
          </text>
          <text x="10" y={height - 5} fill="#9CA3AF" fontSize="10">
            {type === 'cpu' ? `${minValue.toFixed(1)}%` : formatBytes(minValue)}
          </text>
        </svg>
        
        {/* Time labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>
            {data[0] ? new Date(data[0].timestamp).toLocaleTimeString() : ''}
          </span>
          <span>
            {data[data.length - 1] ? new Date(data[data.length - 1].timestamp).toLocaleTimeString() : ''}
          </span>
        </div>
      </div>
    </div>
  );
}