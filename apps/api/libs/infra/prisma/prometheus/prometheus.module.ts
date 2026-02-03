import { Module, Global } from '@nestjs/common';
import {
  PrometheusModule as NestPrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { register } from 'prom-client';

// 在开发环境下清除已有的 metrics，避免热重载时重复注册
// 注意：register.clear() 必须在模块加载之前执行，但不会影响 NestJS 的依赖注入
// 因为 makeCounterProvider 创建的 providers 会在模块初始化时重新注册
if (process.env.NODE_ENV === 'dev') {
  register.clear();
}

// 定义所有 metrics providers
const metricsProviders = [
  // Preference Service Metrics
  makeCounterProvider({
    name: 'preference_cache_hits_total',
    help: 'Total number of preference cache hits',
    labelNames: ['operation'],
  }),
  makeCounterProvider({
    name: 'preference_cache_misses_total',
    help: 'Total number of preference cache misses',
    labelNames: ['operation'],
  }),
  makeHistogramProvider({
    name: 'preference_api_latency_seconds',
    help: 'Preference API call latency in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),
  makeCounterProvider({
    name: 'preference_operations_total',
    help: 'Total number of preference operations',
    labelNames: ['operation'],
  }),

  // Memory Service Metrics
  makeCounterProvider({
    name: 'memory_cache_hits_total',
    help: 'Total number of memory cache hits',
    labelNames: ['operation'],
  }),
  makeCounterProvider({
    name: 'memory_cache_misses_total',
    help: 'Total number of memory cache misses',
    labelNames: ['operation'],
  }),
  makeHistogramProvider({
    name: 'memory_api_latency_seconds',
    help: 'Memory API call latency in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),
  makeCounterProvider({
    name: 'memory_operations_total',
    help: 'Total number of memory operations',
    labelNames: ['operation'],
  }),
  makeCounterProvider({
    name: 'memory_batch_operations_total',
    help: 'Total number of memory batch operations',
    labelNames: ['operation', 'status'],
  }),
  makeHistogramProvider({
    name: 'memory_search_latency_seconds',
    help: 'Memory search latency in seconds',
    labelNames: ['method'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  }),

  // Subscription Service Metrics
  makeCounterProvider({
    name: 'subscription_cache_hits_total',
    help: 'Total number of subscription cache hits',
    labelNames: ['operation'],
  }),
  makeCounterProvider({
    name: 'subscription_cache_misses_total',
    help: 'Total number of subscription cache misses',
    labelNames: ['operation'],
  }),
  makeCounterProvider({
    name: 'subscription_operations_total',
    help: 'Total number of subscription operations',
    labelNames: ['operation'],
  }),
  makeHistogramProvider({
    name: 'subscription_api_latency_seconds',
    help: 'Subscription API call latency in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),

  // Notification Service Metrics
  makeCounterProvider({
    name: 'notification_cache_hits_total',
    help: 'Total number of notification cache hits',
    labelNames: ['operation'],
  }),
  makeCounterProvider({
    name: 'notification_cache_misses_total',
    help: 'Total number of notification cache misses',
    labelNames: ['operation'],
  }),
  makeCounterProvider({
    name: 'notification_operations_total',
    help: 'Total number of notification operations',
    labelNames: ['operation'],
  }),
  makeHistogramProvider({
    name: 'notification_api_latency_seconds',
    help: 'Notification API call latency in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),

  // Subscription Matcher Metrics
  makeCounterProvider({
    name: 'subscription_match_total',
    help: 'Total number of subscription matches',
    labelNames: ['eventType', 'teamId'],
  }),
  makeHistogramProvider({
    name: 'subscription_match_latency_seconds',
    help: 'Subscription matching latency in seconds',
    labelNames: ['eventType'],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2],
  }),
  makeCounterProvider({
    name: 'notification_generation_total',
    help: 'Total number of notifications generated from events',
    labelNames: ['eventType'],
  }),

  // WebSocket Gateway Metrics
  makeCounterProvider({
    name: 'websocket_connections_total',
    help: 'Total number of WebSocket connections',
    labelNames: ['status'], // connected, disconnected
  }),
  makeGaugeProvider({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
  }),
  makeCounterProvider({
    name: 'websocket_notifications_sent_total',
    help: 'Total number of notifications sent via WebSocket',
    labelNames: ['userId'],
  }),

  // Recommendation Service Metrics
  makeCounterProvider({
    name: 'recommendation_cache_hits_total',
    help: 'Total number of recommendation cache hits',
    labelNames: ['cache_type'], // collaborative, recommendations, matrix
  }),
  makeCounterProvider({
    name: 'recommendation_cache_misses_total',
    help: 'Total number of recommendation cache misses',
    labelNames: ['cache_type'],
  }),
  makeCounterProvider({
    name: 'recommendation_cache_invalidations_total',
    help: 'Total number of cache invalidation operations',
    labelNames: ['event_type'], // user-behavior.created, recommendation.accepted, etc.
  }),
  makeHistogramProvider({
    name: 'recommendation_generation_latency_seconds',
    help: 'Recommendation generation latency in seconds',
    labelNames: ['strategy'], // collaborative, graph-based, hybrid
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
  }),
  makeCounterProvider({
    name: 'recommendation_operations_total',
    help: 'Total number of recommendation operations',
    labelNames: ['operation', 'status'], // generate/accept/reject, success/error
  }),
  makeHistogramProvider({
    name: 'recommendation_python_agent_latency_seconds',
    help: 'Python Agent collaborative filtering latency in seconds',
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  }),

  // User Behavior Service Metrics
  makeCounterProvider({
    name: 'user_behavior_cache_hits_total',
    help: 'Total number of user behavior cache hits',
    labelNames: ['cache_type'], // matrix, high-weight
  }),
  makeCounterProvider({
    name: 'user_behavior_cache_misses_total',
    help: 'Total number of user behavior cache misses',
    labelNames: ['cache_type'],
  }),
  makeCounterProvider({
    name: 'user_behavior_tracked_total',
    help: 'Total number of user behaviors tracked',
    labelNames: ['behavior_type'], // VIEW, LIKE, SHARE, etc.
  }),
  makeHistogramProvider({
    name: 'user_behavior_matrix_build_latency_seconds',
    help: 'User-item matrix build latency in seconds',
    labelNames: ['time_window'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  }),
  makeCounterProvider({
    name: 'user_behavior_operations_total',
    help: 'Total number of user behavior operations',
    labelNames: ['operation', 'status'], // track/batch/query, success/error
  }),
];

@Global()
@Module({
  imports: [
    NestPrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/metrics',
    }),
  ],
  providers: metricsProviders,
  exports: [NestPrometheusModule, ...metricsProviders],
})
export class PrometheusConfigModule {}
