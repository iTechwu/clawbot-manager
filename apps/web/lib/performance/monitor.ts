/**
 * Performance Monitoring Utilities
 *
 * 性能监控工具函数
 * 用于收集和上报 Web Vitals 指标
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

export interface Metric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
}

type MetricHandler = (metric: Metric) => void;

/**
 * Web Vitals 指标配置
 */
const VITALS_THRESHOLDS = {
  // Cumulative Layout Shift (CLS)
  CLS: { good: 0.1, poor: 0.25 },
  // Interaction to Next Paint (INP) - 替代已废弃的 FID
  INP: { good: 200, poor: 500 },
  // First Contentful Paint (FCP)
  FCP: { good: 1800, poor: 3000 },
  // Largest Contentful Paint (LCP)
  LCP: { good: 2500, poor: 4000 },
  // Time to First Byte (TTFB)
  TTFB: { good: 800, poor: 1800 },
} as const;

/**
 * 判断指标评级
 */
function getRating(
  name: string,
  value: number,
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * 上报性能指标到分析服务
 */
function reportToAnalytics(metric: Metric) {
  // 在开发环境下，输出到控制台
  if (process.env.NODE_ENV === 'development') {
    console.log('[Performance]', metric.name, {
      value: metric.value.toFixed(2),
      rating: metric.rating,
      id: metric.id,
    });
  }

  // 生产环境：发送到分析服务
  // 示例：可以发送到 Google Analytics、自定义后端 API 等
  if (process.env.NODE_ENV === 'production') {
    // 使用 navigator.sendBeacon 异步发送，不阻塞页面卸载
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      delta: metric.delta,
      url: window.location.href,
      timestamp: Date.now(),
    });

    // 发送到自定义 API（需要根据实际情况配置）
    if (typeof window !== 'undefined' && 'sendBeacon' in navigator) {
      const endpoint =
        process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || '/api/analytics';
      navigator.sendBeacon(endpoint, body);
    }

    // 或者使用 Google Analytics (gtag)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (
        window as unknown as {
          gtag: (
            event: string,
            name: string,
            options: Record<string, unknown>,
          ) => void;
        }
      ).gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
        metric_rating: metric.rating,
      });
    }
  }
}

/**
 * 初始化 Web Vitals 监控
 *
 * @param onReport 自定义上报函数（可选）
 */
export function initWebVitals(onReport?: MetricHandler) {
  const handler: MetricHandler = (metric) => {
    // 添加评级
    const metricWithRating = {
      ...metric,
      rating: getRating(metric.name, metric.value),
    };

    // 调用自定义上报函数
    if (onReport) {
      onReport(metricWithRating);
    }

    // 默认上报
    reportToAnalytics(metricWithRating);
  };

  // 监听各个 Web Vitals 指标
  onCLS(handler);
  onFCP(handler);
  onLCP(handler);
  onTTFB(handler);
  onINP(handler); // INP 替代已废弃的 FID

  return () => {
    // 清理函数（如果需要）
  };
}

/**
 * 手动测量自定义性能指标
 */
export function measurePerformance(
  name: string,
  fn: () => void | Promise<void>,
) {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}-measure`;

  // 开始标记
  if (typeof window !== 'undefined' && 'performance' in window) {
    performance.mark(startMark);
  }

  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        performance.mark(endMark);
        try {
          performance.measure(measureName, startMark, endMark);
          const measure = performance.getEntriesByName(measureName)[0];
          if (measure) {
            console.log(
              `[Performance] ${name}: ${measure.duration.toFixed(2)}ms`,
            );
          }
        } catch {
          // 忽略测量错误
        }
      }
    });
  } else {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(endMark);
      try {
        performance.measure(measureName, startMark, endMark);
        const measure = performance.getEntriesByName(measureName)[0];
        if (measure) {
          console.log(
            `[Performance] ${name}: ${measure.duration.toFixed(2)}ms`,
          );
        }
      } catch {
        // 忽略测量错误
      }
    }
    return result;
  }
}

/**
 * 获取页面加载性能指标
 */
export function getPageLoadMetrics() {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return null;
  }

  const navigation = performance.getEntriesByType(
    'navigation',
  )[0] as PerformanceNavigationTiming;
  if (!navigation) return null;

  return {
    // DNS 查询时间
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    // TCP 连接时间
    tcp: navigation.connectEnd - navigation.connectStart,
    // 请求时间
    request: navigation.responseStart - navigation.requestStart,
    // 响应时间
    response: navigation.responseEnd - navigation.responseStart,
    // DOM 解析时间
    domParse: navigation.domInteractive - navigation.responseEnd,
    // 资源加载时间
    resourceLoad:
      navigation.loadEventStart - navigation.domContentLoadedEventEnd,
    // 总时间
    total: navigation.loadEventEnd - navigation.fetchStart,
  };
}
