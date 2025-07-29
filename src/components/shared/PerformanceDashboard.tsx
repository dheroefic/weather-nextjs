'use client';

import React, { useState, useEffect, memo } from 'react';
import Image from 'next/image';

// Only include in development
const isDev = process.env.NODE_ENV === 'development';

interface PerformanceStats {
  renderTime: number;
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage?: number;
}

interface PerformanceDashboardProps {
  isVisible: boolean;
  onToggle: () => void;
}

// Return empty component in production
const EmptyComponent = () => null;

const PerformanceDashboard = isDev ? memo(function PerformanceDashboard({
  isVisible,
  onToggle
}: PerformanceDashboardProps) {
  const [stats, setStats] = useState<PerformanceStats>({
    renderTime: 0,
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0
  });

  useEffect(() => {
    if (!isVisible) return;

    const updateStats = () => {
      // Get performance stats from localStorage or global performance monitoring
      const performanceData = JSON.parse(localStorage.getItem('performanceStats') || '{}');
      
      setStats({
        renderTime: performanceData.averageRenderTime || 0,
        apiCalls: performanceData.totalApiCalls || 0,
        cacheHits: performanceData.cacheHits || 0,
        cacheMisses: performanceData.cacheMisses || 0,
        memoryUsage: (performance as { memory?: { usedJSHeapSize: number } })?.memory?.usedJSHeapSize || 0
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600/20 backdrop-blur-md p-2 rounded-full shadow-lg hover:bg-blue-600/30 transition-all duration-300 z-50"
        title="Show Performance Dashboard"
      >
        <Image
          src="/icons/weathers/star.svg"
          alt="Performance"
          width={24}
          height={24}
          className="w-6 h-6 opacity-80"
        />
      </button>
    );
  }

  const cacheHitRate = stats.cacheHits + stats.cacheMisses > 0 
    ? (stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100).toFixed(1)
    : '0';

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-lg text-white p-4 rounded-lg shadow-xl max-w-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Performance Monitor</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors"
          title="Hide Dashboard"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Render Time:</span>
          <span className={stats.renderTime > 100 ? 'text-red-400' : 'text-green-400'}>
            {stats.renderTime.toFixed(1)}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>API Calls:</span>
          <span>{stats.apiCalls}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Cache Hit Rate:</span>
          <span className={parseFloat(cacheHitRate) > 80 ? 'text-green-400' : 'text-yellow-400'}>
            {cacheHitRate}%
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Cache Hits:</span>
          <span className="text-green-400">{stats.cacheHits}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Cache Misses:</span>
          <span className="text-red-400">{stats.cacheMisses}</span>
        </div>
        
        {stats.memoryUsage && (
          <div className="flex justify-between">
            <span>Memory:</span>
            <span>{(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          ✅ Optimizations Applied:
        </div>
        <div className="text-xs text-green-400 mt-1">
          • React.memo • Lazy Loading<br/>
          • Service Worker • Dual Cache<br/>
          • Request Deduplication
        </div>
      </div>
    </div>
  );
}) : EmptyComponent;

export default PerformanceDashboard;
