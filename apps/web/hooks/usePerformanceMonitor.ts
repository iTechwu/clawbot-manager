/**
 * Performance Monitoring Hook
 *
 * 性能监控 React Hook
 * 用于在组件中监控和上报性能指标
 */

import { useEffect, useRef } from 'react';
import { initWebVitals, type Metric } from '@/lib/performance/monitor';

export interface UsePerformanceMonitorOptions {
  /** 是否启用监控（默认：true） */
  enabled?: boolean;
  /** 自定义上报函数 */
  onReport?: (metric: Metric) => void;
  /** 仅在页面可见时监控（默认：true） */
  onlyWhenVisible?: boolean;
}

/**
 * 性能监控 Hook
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   usePerformanceMonitor({
 *     onReport: (metric) => {
 *       console.log('Performance metric:', metric);
 *     },
 *   });
 *
 *   return <div>Page content</div>;
 * }
 * ```
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {},
) {
  const { enabled = true, onReport, onlyWhenVisible = true } = options;

  const cleanupRef = useRef<(() => void) | null>(null);
  const isMonitoringRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    // 如果设置了仅可见时监控，检查页面可见性
    if (onlyWhenVisible && document.hidden) {
      // 等待页面可见时再初始化
      const handleVisibilityChange = () => {
        if (!document.hidden && !isMonitoringRef.current) {
          cleanupRef.current = initWebVitals(onReport);
          isMonitoringRef.current = true;
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
        if (cleanupRef.current) {
          cleanupRef.current();
        }
      };
    }

    // 立即初始化监控
    if (!isMonitoringRef.current) {
      cleanupRef.current = initWebVitals(onReport);
      isMonitoringRef.current = true;
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        isMonitoringRef.current = false;
      }
    };
  }, [enabled, onReport, onlyWhenVisible]);
}

/**
 * 自定义性能指标测量 Hook
 */
export function usePerformanceMeasure(name: string, enabled = true) {
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (!('performance' in window)) return;

    startTimeRef.current = performance.now();

    return () => {
      if (startTimeRef.current !== null) {
        const duration = performance.now() - startTimeRef.current;
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      }
    };
  }, [name, enabled]);
}
