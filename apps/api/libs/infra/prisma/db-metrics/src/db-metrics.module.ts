import { Module, Global } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { ConfigModule } from '@nestjs/config';
import { PrometheusConfigModule } from '../../prometheus';
import { DbMetricsService } from './db-metrics.service';

/**
 * Database Metrics Module
 * 数据库指标模块
 *
 * Provides database query and transaction metrics collection
 * with Prometheus integration and Winston logging.
 *
 * 提供数据库查询和事务指标收集，
 * 集成 Prometheus 和 Winston 日志。
 *
 * @example
 * ```typescript
 * // Import in AppModule
 * @Module({
 *   imports: [DbMetricsModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    // 导入 PrometheusConfigModule 而不是自己注册 PrometheusModule
    // 这样可以避免重复注册 /metrics 路由
    // PrometheusConfigModule 已经全局注册了 Prometheus 模块和 /metrics 路由
    PrometheusConfigModule,
  ],
  providers: [
    DbMetricsService,

    // =====================================================================
    // Query Metrics
    // 查询指标
    // =====================================================================

    /**
     * Query duration histogram
     * 查询时长直方图
     *
     * Buckets are chosen to capture typical database query latencies:
     * - 10ms-100ms: Fast queries
     * - 100ms-500ms: Normal queries
     * - 500ms-1s: Slow queries
     * - 1s+: Very slow queries requiring optimization
     */
    makeHistogramProvider({
      name: 'prisma_query_duration_seconds',
      help: 'Duration of Prisma queries in seconds',
      labelNames: ['model', 'action', 'db_type', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),

    /**
     * Total query counter
     * 查询总数计数器
     */
    makeCounterProvider({
      name: 'prisma_query_total',
      help: 'Total number of Prisma queries',
      labelNames: ['model', 'action', 'db_type', 'status'],
    }),

    /**
     * Slow query counter by threshold level
     * 按阈值级别的慢查询计数器
     */
    makeCounterProvider({
      name: 'prisma_slow_query_total',
      help: 'Total number of slow queries by threshold level',
      labelNames: ['model', 'action', 'db_type', 'threshold_level'],
    }),

    // =====================================================================
    // Transaction Metrics
    // 事务指标
    // =====================================================================

    /**
     * Transaction duration histogram
     * 事务时长直方图
     *
     * Buckets are chosen for typical transaction durations:
     * - 100ms-1s: Fast transactions
     * - 1s-10s: Normal transactions
     * - 10s+: Long-running transactions
     */
    makeHistogramProvider({
      name: 'prisma_transaction_duration_seconds',
      help: 'Duration of Prisma transactions in seconds',
      labelNames: ['status', 'retry_count', 'isolation_level'],
      buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
    }),

    /**
     * Total transaction counter
     * 事务总数计数器
     */
    makeCounterProvider({
      name: 'prisma_transaction_total',
      help: 'Total number of transactions',
      labelNames: ['status', 'retry_count', 'isolation_level'],
    }),

    /**
     * Active transactions gauge
     * 活跃事务数仪表
     */
    makeGaugeProvider({
      name: 'prisma_active_transactions',
      help: 'Number of currently active transactions',
    }),

    // =====================================================================
    // Connection Pool Metrics
    // 连接池指标
    // =====================================================================

    /**
     * Active connections gauge
     * 活跃连接数仪表
     */
    makeGaugeProvider({
      name: 'prisma_pool_connections_active',
      help: 'Number of active connections in the pool',
      labelNames: ['db_type'],
    }),
  ],
  exports: [DbMetricsService],
})
export class DbMetricsModule {}
