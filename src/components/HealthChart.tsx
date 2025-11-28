'use client';

import { useMemo } from 'react';
import { formatBytes } from '@/lib/utils';

interface HealthChartProps {
  data: any[];
  type: 'health' | 'cpu' | 'memory' | 'response';
  height?: number;
  showTrend?: boolean;
}

export function HealthChart({ data, type, height = 200, showTrend = true }: HealthChartProps) {
  const { chartData, maxValue, minValue, gradient, color, unit } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], maxValue: 0, minValue: 0, gradient: 'gradient-health', color: '#10B981', unit: '' };
    }

    let values: number[] = [];
    let gradientId = 'gradient-health';
    let strokeColor = '#10B981';
    let unitText = '';

    switch (type) {
      case 'health':
        values = data.map(d => d.healthScore || d.value || 0);
        gradientId = 'gradient-health';
        strokeColor = '#10B981';
        unitText = '';
        break;
      case 'cpu':
        values = data.map(d => d.cpu || d.value || 0);
        gradientId = 'gradient-cpu';
        strokeColor = '#3B82F6';
        unitText = '%';
        break;
      case 'memory':
        values = data.map(d => d.memory || d.heapUsed || 0);
        gradientId = 'gradient-memory';
        strokeColor = '#A855F7';
        unitText = '';
        break;
      case 'response':
        values = data.map(d => d.responseTime || 0);
        gradientId = 'gradient-response';
        strokeColor = '#F59E0B';
        unitText = 'ms';
        break;
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    
    const chartData = data.map((d, index) => {
      const value = values[index];
      const normalizedValue = max > min ? ((value - min) / (max - min)) : 0;
      
      return {
        x: (index / Math.max(data.length - 1, 1)) * 100,
        y: height - (normalizedValue * (height - 40)) - 20,
        value,
        timestamp: d.timestamp,
        rawData: d
      };
    });

    return { 
      chartData, 
      maxValue: max, 
      minValue: min, 
      gradient: gradientId, 
      color: strokeColor,
      unit: unitText
    };
  }, [data, type, height]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-800 rounded border">
        <p className="text-gray-400">No {type} data available</p>
      </div>
    );
  }

  const pathData = chartData.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${point.x}% ${point.y}`;
  }).join(' ');

  const areaPath = `${pathData} L ${chartData[chartData.length - 1]?.x || 0}% ${height} L 0% ${height} Z`;

  // Calculate trend
  const firstValue = chartData[0]?.value || 0;
  const lastValue = chartData[chartData.length - 1]?.value || 0;
  const trendPercentage = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  const formatValue = (value: number) => {
    if (type === 'memory') {
      return formatBytes(value);
    }
    return `${value.toFixed(type === 'health' ? 0 : 1)}${unit}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-white font-medium capitalize">
          {type === 'health' ? 'Health Score' : 
           type === 'response' ? 'Response Time' :
           `${type.toUpperCase()} Usage`} Over Time
        </h4>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
            <span className="text-gray-300">
              Current: {formatValue(lastValue)}
            </span>
          </div>
          {showTrend && (
            <div className={`text-sm ${
              trendPercentage > 0 
                ? (type === 'health' ? 'text-green-400' : 'text-red-400') 
                : (type === 'health' ? 'text-red-400' : 'text-green-400')
            }`}>
              {trendPercentage > 0 ? '↗' : '↘'} {Math.abs(trendPercentage).toFixed(1)}%
            </div>
          )}
          <div className="text-gray-400">
            {data.length} samples
          </div>
        </div>
      </div>
      
      <div className="relative">
        <svg width="100%" height={height} className="border border-gray-700 rounded">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeOpacity="0.3" strokeWidth="0.5"/>
            </pattern>
            
            <linearGradient id="gradient-health" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
            </linearGradient>
            
            <linearGradient id="gradient-cpu" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
            </linearGradient>
            
            <linearGradient id="gradient-memory" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0.05" />
            </linearGradient>
            
            <linearGradient id="gradient-response" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Critical thresholds */}
          {type === 'health' && (
            <>
              <line x1="0%" y1={height - (80/100) * (height - 40) - 20} x2="100%" y2={height - (80/100) * (height - 40) - 20} stroke="#10B981" strokeWidth="1" strokeDasharray="5,5" opacity="0.5" />
              <line x1="0%" y1={height - (60/100) * (height - 40) - 20} x2="100%" y2={height - (60/100) * (height - 40) - 20} stroke="#F59E0B" strokeWidth="1" strokeDasharray="5,5" opacity="0.5" />
              <line x1="0%" y1={height - (40/100) * (height - 40) - 20} x2="100%" y2={height - (40/100) * (height - 40) - 20} stroke="#EF4444" strokeWidth="1" strokeDasharray="5,5" opacity="0.5" />
            </>
          )}
          
          {/* Area chart */}
          {chartData.length > 1 && (
            <path
              d={areaPath}
              fill={`url(#${gradient})`}
              stroke="none"
            />
          )}
          
          {/* Line chart */}
          {chartData.length > 1 && (
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Data points with health-based colors */}
          {chartData.map((point, index) => {
            let pointColor = color;
            if (type === 'health') {
              if (point.value >= 80) pointColor = '#10B981';
              else if (point.value >= 60) pointColor = '#F59E0B';
              else pointColor = '#EF4444';
            }
            
            return (
              <g key={index}>
                <circle
                  cx={`${point.x}%`}
                  cy={point.y}
                  r="3"
                  fill={pointColor}
                  className="hover:r-5 transition-all cursor-pointer"
                >
                  <title>
                    {new Date(point.timestamp).toLocaleString()}: {formatValue(point.value)}
                    {point.rawData.status && ` (${point.rawData.status})`}
                  </title>
                </circle>
              </g>
            );
          })}
          
          {/* Y-axis labels */}
          <text x="10" y="15" fill="#9CA3AF" fontSize="10">
            {formatValue(maxValue)}
          </text>
          <text x="10" y={height - 5} fill="#9CA3AF" fontSize="10">
            {formatValue(minValue)}
          </text>
          
          {/* Threshold labels for health */}
          {type === 'health' && (
            <>
              <text x="10" y={height - (80/100) * (height - 40) - 15} fill="#10B981" fontSize="9">Excellent (80+)</text>
              <text x="10" y={height - (60/100) * (height - 40) - 15} fill="#F59E0B" fontSize="9">Good (60+)</text>
              <text x="10" y={height - (40/100) * (height - 40) - 15} fill="#EF4444" fontSize="9">Poor (40+)</text>
            </>
          )}
        </svg>
        
        {/* Time labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>
            {data[0] ? new Date(data[0].timestamp).toLocaleString() : ''}
          </span>
          <span>
            {data[data.length - 1] ? new Date(data[data.length - 1].timestamp).toLocaleString() : ''}
          </span>
        </div>
      </div>
    </div>
  );
}