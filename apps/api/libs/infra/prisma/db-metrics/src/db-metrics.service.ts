import { Injectable, Inject, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Counter, Histogram, Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { clsNamespace } from '@/middleware/request.middleware';
import enviroment from '@/utils/enviroment.util';

/**
 * Slow query threshold levels
 * 慢查询阈值级别
 */
export interface SlowQueryThresholds {
  /**
   * Queries >= info threshold will be logged at INFO level (ms)
   * 达到此阈值的查询将以 INFO 级别记录
   */
  info: number;

  /**
   * Queries >= warn threshold will be logged at WARN level (ms)
   * 达到此阈值的查询将以 WARN 级别记录
   */
  warn: number;

  /**
   * Queries >= error threshold will be logged at ERROR level (ms)
   * 达到此阈值的查询将以 ERROR 级别记录
   */
  error: number;
}

/**
 * Database metrics configuration
 * 数据库指标配置
 */
export interface DbMetricsConfig {
  /**
   * Enable or disable metrics collection
   * 启用或禁用指标收集
   */
  enabled: boolean;

  /**
   * Slow query thresholds
   * 慢查询阈值
   */
  slowQueryThresholds: SlowQueryThresholds;

  /**
   * Whether to log query parameters
   * 是否记录查询参数
   */
  logQueryParams: boolean;

  /**
   * Whether to log query results
   * 是否记录查询结果
   */
  logQueryResult: boolean;

  /**
   * Maximum length of parameters to log
   * 记录参数的最大长度
   */
  maxParamLogLength: number;
}

/**
 * Default configuration values
 * 默认配置值
 */
const DEFAULT_CONFIG: DbMetricsConfig = {
  enabled: true,
  slowQueryThresholds: {
    info: 100,
    warn: 500,
    error: 1000,
  },
  logQueryParams: true,
  logQueryResult: false,
  maxParamLogLength: 1000,
};

/**
 * Query context for tracking
 * 查询跟踪上下文
 */
export interface QueryContext {
  startTime: number;
  traceId: string;
}

/**
 * Query parameters for metrics
 * 查询指标参数
 */
export interface QueryParams {
  model: string;
  action: string;
  dbType: 'read' | 'write';
}

/**
 * Transaction context for tracking
 * 事务跟踪上下文
 */
export interface TransactionContext {
  startTime: number;
  traceId: string;
  sqlCount: number;
  tablesInvolved: Set<string>;
}

/**
 * Transaction metadata for logging
 * 事务日志元数据
 */
export interface TransactionMetadata {
  retryCount?: number;
  isolationLevel?: string;
  sqlCount?: number;
  tablesInvolved?: string[];
  lockWaitTime?: number;
  errorType?: string;
  errorMessage?: string;
  methodName?: string;
}

/**
 * Database Metrics Service
 * 数据库指标服务
 *
 * Provides unified metrics collection and logging for database operations.
 * 为数据库操作提供统一的指标收集和日志记录。
 */
@Injectable()
export class DbMetricsService implements OnModuleInit {
  private config: DbMetricsConfig = DEFAULT_CONFIG;

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional()
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger?: Logger,
    @Optional()
    @InjectMetric('prisma_query_duration_seconds')
    private readonly queryDuration?: Histogram<string>,
    @Optional()
    @InjectMetric('prisma_query_total')
    private readonly queryTotal?: Counter<string>,
    @Optional()
    @InjectMetric('prisma_slow_query_total')
    private readonly slowQueryTotal?: Counter<string>,
    @Optional()
    @InjectMetric('prisma_transaction_duration_seconds')
    private readonly txDuration?: Histogram<string>,
    @Optional()
    @InjectMetric('prisma_transaction_total')
    private readonly txTotal?: Counter<string>,
    @Optional()
    @InjectMetric('prisma_active_transactions')
    private readonly activeTx?: Gauge<string>,
  ) {}

  onModuleInit() {
    const config = this.configService?.get<DbMetricsConfig>('dbMetrics');
    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }
    if (enviroment.isProduction()) {
      this.logger.info('DbMetricsService module initialized', {
        config: this.config,
      });
    } else {
      this.logger.debug('DbMetricsService module initialized', {
        config: this.config,
      });
    }
  }

  /**
   * Get current configuration
   * 获取当前配置
   */
  getConfig(): DbMetricsConfig {
    return this.config;
  }

  /**
   * Check if metrics collection is enabled
   * 检查指标收集是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // =========================================================================
  // Query Metrics Methods
  // 查询指标方法
  // =========================================================================

  /**
   * Start tracking a query
   * 开始跟踪查询
   */
  recordQueryStart(): QueryContext {
    return {
      startTime: Date.now(),
      traceId: this.getTraceId(),
    };
  }

  /**
   * Record query completion
   * 记录查询完成
   */
  recordQueryEnd(
    ctx: QueryContext,
    params: QueryParams,
    status: 'success' | 'error',
    args?: unknown,
    error?: Error,
  ): void {
    if (!this.config.enabled) return;

    const duration = Date.now() - ctx.startTime;
    const durationSec = duration / 1000;
    const { model, action, dbType } = params;

    // Record Prometheus metrics
    this.queryDuration?.observe(
      { model, action, db_type: dbType, status },
      durationSec,
    );
    this.queryTotal?.inc({ model, action, db_type: dbType, status });

    // Determine threshold level and log appropriately
    const thresholdLevel = this.getThresholdLevel(duration);
    if (thresholdLevel) {
      this.slowQueryTotal?.inc({
        model,
        action,
        db_type: dbType,
        threshold_level: thresholdLevel,
      });
    }

    // Log query information
    this.logQuery(
      ctx.traceId,
      duration,
      params,
      status,
      args,
      error,
      thresholdLevel,
    );
  }

  /**
   * Determine the threshold level based on query duration
   * 根据查询时长确定阈值级别
   */
  private getThresholdLevel(
    duration: number,
  ): 'info' | 'warn' | 'error' | null {
    const { slowQueryThresholds } = this.config;
    if (duration >= slowQueryThresholds.error) return 'error';
    if (duration >= slowQueryThresholds.warn) return 'warn';
    if (duration >= slowQueryThresholds.info) return 'info';
    return null;
  }

  /**
   * Log query information with appropriate level
   * 以适当的级别记录查询信息
   */
  private logQuery(
    traceId: string,
    duration: number,
    params: QueryParams,
    status: string,
    args?: unknown,
    error?: Error,
    thresholdLevel?: string | null,
  ): void {
    const logData: Record<string, unknown> = {
      traceId,
      duration: `${duration}ms`,
      model: params.model,
      action: params.action,
      dbType: params.dbType,
      status,
      timestamp: new Date().toISOString(),
    };

    if (this.config.logQueryParams && args) {
      const argsStr = JSON.stringify(args);
      logData.params =
        argsStr.length > this.config.maxParamLogLength
          ? argsStr.substring(0, this.config.maxParamLogLength) + '...'
          : argsStr;
    }

    if (error) {
      logData.error = { name: error.name, message: error.message };
    }

    // Log based on threshold level
    if (thresholdLevel === 'error') {
      this.logger?.error('Slow Query [CRITICAL]', logData);
    } else if (thresholdLevel === 'warn') {
      this.logger?.warn('Slow Query [WARNING]', logData);
    } else if (thresholdLevel === 'info') {
      this.logger?.info('Slow Query [INFO]', logData);
    } else if (status === 'error') {
      this.logger?.error('Query Error', logData);
    } else {
      this.logger?.debug('Query Executed', logData);
    }
  }

  // =========================================================================
  // Transaction Metrics Methods
  // 事务指标方法
  // =========================================================================

  /**
   * Start tracking a transaction
   * 开始跟踪事务
   */
  recordTransactionStart(): TransactionContext {
    this.activeTx?.inc();
    return {
      startTime: Date.now(),
      traceId: this.getTraceId(),
      sqlCount: 0,
      tablesInvolved: new Set<string>(),
    };
  }

  /**
   * Increment SQL count in transaction context
   * 增加事务上下文中的 SQL 计数
   */
  incrementSqlCount(ctx: TransactionContext, model?: string): void {
    ctx.sqlCount++;
    if (model) {
      ctx.tablesInvolved.add(model);
    }
  }

  /**
   * Record transaction completion
   * 记录事务完成
   */
  recordTransactionEnd(
    ctx: TransactionContext,
    status: 'success' | 'error' | 'rollback',
    metadata: TransactionMetadata = {},
  ): void {
    if (!this.config.enabled) return;

    this.activeTx?.dec();
    const duration = Date.now() - ctx.startTime;
    const durationSec = duration / 1000;

    const labels = {
      status,
      retry_count: String(metadata.retryCount || 0),
      isolation_level: metadata.isolationLevel || 'default',
    };

    this.txDuration?.observe(labels, durationSec);
    this.txTotal?.inc(labels);

    // Merge context data with metadata
    const fullMetadata: TransactionMetadata = {
      ...metadata,
      sqlCount: ctx.sqlCount,
      tablesInvolved: Array.from(ctx.tablesInvolved),
    };

    this.logTransaction(ctx.traceId, duration, status, fullMetadata);
  }

  /**
   * Log transaction information
   * 记录事务信息
   */
  private logTransaction(
    traceId: string,
    duration: number,
    status: string,
    metadata: TransactionMetadata,
  ): void {
    const logData = {
      traceId,
      duration: `${duration}ms`,
      status,
      ...metadata,
      timestamp: new Date().toISOString(),
    };

    if (status === 'error' || status === 'rollback') {
      this.logger?.error('Transaction Failed', logData);
    } else if (duration > this.config.slowQueryThresholds.warn) {
      this.logger?.warn('Slow Transaction', logData);
    } else {
      this.logger?.info('Transaction Completed', logData);
    }
  }

  // =========================================================================
  // Utility Methods
  // 工具方法
  // =========================================================================

  /**
   * Get current trace ID from CLS namespace
   * 从 CLS 命名空间获取当前 traceId
   */
  private getTraceId(): string {
    try {
      return clsNamespace?.get('traceID') || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Create a fallback context when metrics service is not available
   * 当指标服务不可用时创建回退上下文
   */
  static createFallbackQueryContext(): QueryContext {
    return {
      startTime: Date.now(),
      traceId: 'unknown',
    };
  }

  /**
   * Create a fallback transaction context
   * 创建回退事务上下文
   */
  static createFallbackTransactionContext(): TransactionContext {
    return {
      startTime: Date.now(),
      traceId: 'unknown',
      sqlCount: 0,
      tablesInvolved: new Set<string>(),
    };
  }
}
