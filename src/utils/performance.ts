import React from 'react';

// Performance monitoring utility
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private marks: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasure(name: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const timestamp = performance.now();
      this.marks.set(name, timestamp);
      performance.mark(`${name}-start`);
    }
  }

  endMeasure(name: string): number | null {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const startTime = this.marks.get(name);
      if (startTime) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        this.marks.delete(name);
        
        // Log slow operations
        if (duration > 100) {
          console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
        }
        
        return duration;
      }
    }
    return null;
  }

  measureAsync<T>(name: string, asyncFn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);
    return asyncFn().finally(() => {
      this.endMeasure(name);
    });
  }

  getPerformanceMetrics(): PerformanceEntryList {
    if (typeof window !== 'undefined' && 'performance' in window) {
      return performance.getEntriesByType('measure');
    }
    return [];
  }

  clearMetrics(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.clearMarks();
      performance.clearMeasures();
    }
    this.marks.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now();
  
  React.useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (renderTime > 16) { // Longer than 1 frame at 60fps
      console.warn(`Component ${componentName} render took ${renderTime.toFixed(2)}ms`);
    }
  });
}

// Debounce utility for API calls
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Generic request queue for managing API calls
class RequestQueue<T = unknown> {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private concurrent = 0;
  private maxConcurrent = 3;

  async add(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.concurrent++;
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.concurrent--;
          this.processNext();
        }
      });
      
      this.processNext();
    });
  }

  private processNext() {
    if (this.concurrent >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    const nextRequest = this.queue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
}

export const requestQueue = new RequestQueue();
