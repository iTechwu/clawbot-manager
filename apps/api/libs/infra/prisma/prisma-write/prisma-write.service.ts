import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bigintUtil from '@/utils/bigint.util';
import { setupSoftDeleteMiddleware } from '../middleware/soft-delete.middleware';
import enviroment from '@/utils/enviroment.util';
import {
  DbMetricsService,
  QueryContext,
} from '../db-metrics/src/db-metrics.service';

/**
 * Prisma Write Service
 * Prisma 写服务
 *
 * Provides write database access with:
 * - Query performance monitoring
 * - Slow query detection with configurable thresholds
 * - Prometheus metrics integration
 * - BigInt serialization support
 *
 * 提供写数据库访问，包含：
 * - 查询性能监控
 * - 可配置阈值的慢查询检测
 * - Prometheus 指标集成
 * - BigInt 序列化支持
 */
@Injectable()
export class PrismaWriteService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;
  private pool: Pool;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Optional() private readonly dbMetrics?: DbMetricsService,
  ) {
    // Prisma 7.x: 使用 @prisma/adapter-pg 驱动适配器
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // 创建 pg 连接池
    this.pool = new Pool({
      connectionString,
      // 连接池配置，与 Prisma 6 保持一致
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 300000, // 5分钟
      max: 20, // 写操作使用更大的连接池
    });

    // 创建 Prisma 适配器 - 直接传入 Pool 实例
    const adapter = new PrismaPg(this.pool);

    // 使用适配器创建 PrismaClient
    const basePrisma = new PrismaClient({ adapter });

    // Prisma 7.x: 使用 $extends 替代 $use
    // 先应用软删除扩展，再应用监控扩展
    this.prisma = this.setupExtensions(basePrisma);
  }

  /**
   * Setup Prisma extensions for query monitoring and soft delete
   * Prisma 7.x: 使用 $extends 替代 $use
   * 设置 Prisma 扩展用于查询监控和软删除
   */
  private setupExtensions(basePrisma: PrismaClient): PrismaClient {
    // 保存引用以便在回调中使用
    const dbMetrics = this.dbMetrics;
    const logger = this.logger;
    const fallbackLog = this.fallbackLog.bind(this);

    // 先应用软删除扩展
    const withSoftDelete = setupSoftDeleteMiddleware(basePrisma);

    // 应用监控扩展
    return withSoftDelete.$extends({
      query: {
        $allOperations({ operation, model, args, query }) {
          // Start tracking
          const ctx: QueryContext = dbMetrics?.recordQueryStart() ?? {
            startTime: Date.now(),
            traceId: 'unknown',
          };

          // 执行查询并处理结果
          const result = query(args);

          // 处理 Promise 结果
          if (result instanceof Promise) {
            return result
              .then((res) => {
                const serialized = bigintUtil.serialize(res);
                if (dbMetrics) {
                  dbMetrics.recordQueryEnd(
                    ctx,
                    {
                      model: model || 'unknown',
                      action: operation,
                      dbType: 'write',
                    },
                    'success',
                    args,
                  );
                } else {
                  fallbackLog(
                    ctx.startTime,
                    { model, action: operation, args },
                    'success',
                  );
                }
                return serialized;
              })
              .catch((error) => {
                // Record error
                if (dbMetrics) {
                  dbMetrics.recordQueryEnd(
                    ctx,
                    {
                      model: model || 'unknown',
                      action: operation,
                      dbType: 'write',
                    },
                    'error',
                    args,
                    error as Error,
                  );
                } else {
                  fallbackLog(
                    ctx.startTime,
                    { model, action: operation, args },
                    'error',
                    error as Error,
                  );
                }
                throw error;
              });
          }

          // 同步结果处理
          try {
            const serialized = bigintUtil.serialize(result);
            if (dbMetrics) {
              dbMetrics.recordQueryEnd(
                ctx,
                {
                  model: model || 'unknown',
                  action: operation,
                  dbType: 'write',
                },
                'success',
                args,
              );
            } else {
              fallbackLog(
                ctx.startTime,
                { model, action: operation, args },
                'success',
              );
            }
            return serialized;
          } catch (error) {
            if (dbMetrics) {
              dbMetrics.recordQueryEnd(
                ctx,
                {
                  model: model || 'unknown',
                  action: operation,
                  dbType: 'write',
                },
                'error',
                args,
                error as Error,
              );
            } else {
              fallbackLog(
                ctx.startTime,
                { model, action: operation, args },
                'error',
                error as Error,
              );
            }
            throw error;
          }
        },
      },
    }) as any;
  }

  /**
   * Fallback logging when DbMetricsService is not injected
   * 当 DbMetricsService 未注入时的回退日志记录
   */
  private fallbackLog(
    startTime: number,
    params: { model?: string; action: string; args?: unknown },
    status: 'success' | 'error',
    error?: Error,
  ): void {
    const duration = Date.now() - startTime;
    const logData = {
      message: 'WriteDB Query 执行信息',
      detail: {
        耗时: `${duration}ms`,
        时间: new Date().toISOString(),
        操作: `${params.model}.${params.action}`,
        参数: JSON.stringify(params.args),
        状态: status,
      },
    };

    if (status === 'error' && error) {
      this.logger.error({
        ...logData,
        error: { name: error.name, message: error.message },
      });
    } else if (duration > 1000) {
      this.logger.warn({
        message: 'WriteDB Query 性能警告',
        detail: {
          操作: `${params.model}.${params.action}`,
          耗时: `${duration}ms`,
          提示: '此操作的执行时间超过了1000ms，请考虑优化',
        },
      });
    } else {
      this.logger.info(logData);
    }
  }

  /**
   * Get the Prisma client instance
   * 获取 Prisma 客户端实例
   */
  get client(): PrismaClient {
    return this.prisma;
  }

  async onModuleInit() {
    await this.prisma.$connect();
    if (enviroment.isProduction()) {
      this.logger.info('PrismaWriteService connected to database');
    }
    // this.logger.info('PrismaWriteService connected to database');
  }

  async onModuleDestroy() {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      this.logger.warn('Error disconnecting Prisma client', { error });
    }

    // 检查 pool 是否已经关闭，避免重复调用 end()
    if (this.pool && !this.pool.ended) {
      try {
        await this.pool.end();
      } catch (error) {
        this.logger.warn('Error closing database pool', { error });
      }
    }
    if (enviroment.isProduction()) {
      this.logger.info('PrismaWriteService disconnected from database');
    }
    // this.logger.info('PrismaWriteService disconnected from database');
  }
}
