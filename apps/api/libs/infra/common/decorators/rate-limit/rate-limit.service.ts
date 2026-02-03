/**
 * Rate Limit Service
 *
 * 限流服务，使用 Redis Sorted Set 实现滑动窗口算法
 *
 * 特性:
 * - 多维度限流 (IP, userId, tenantId, apiKey)
 * - Redis 分布式存储
 * - Feature Flag 动态开关
 * - 白名单支持
 * - 结构化日志和监控
 *
 * 配置项 (config.local.yaml):
 * ```yaml
 * rateLimit:
 *   enabled: true
 *   featureFlag: 'rate-limit-enabled'
 *   default:
 *     limit: 100
 *     window: 60
 *   dimensions:
 *     ip: { limit: 200, window: 60 }
 *     userId: { limit: 500, window: 60 }
 *     tenantId: { limit: 2000, window: 60 }
 *     apiKey: { limit: 1000, window: 60 }
 *   redis:
 *     keyPrefix: 'pardx:ratelimit:'
 *   whitelist:
 *     ips: ['127.0.0.1', '::1']
 *     userIds: []
 *     apiKeys: []
 * ```
 */

import { Injectable, Inject, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisService } from '@app/redis';
import { FeatureFlagService } from '../feature-flag/feature-flag.service';

import {
  RateLimitConfig,
  RateLimitContext,
  RateLimitDimension,
  RateLimitDimensionConfig,
  RateLimitEvent,
  RateLimitOptions,
  RateLimitResult,
} from './dto/rate-limit.dto';
import enviroment from '@/utils/enviroment.util';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: RateLimitConfig = {
  enabled: true,
  featureFlag: 'rate-limit-enabled',
  default: { limit: 100, window: 60 },
  dimensions: {
    ip: { limit: 200, window: 60 },
    userId: { limit: 500, window: 60 },
    tenantId: { limit: 2000, window: 60 },
    apiKey: { limit: 1000, window: 60 },
  },
  redis: { keyPrefix: 'pardx:ratelimit:' },
  whitelist: { ips: ['127.0.0.1', '::1'], userIds: [], apiKeys: [] },
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class RateLimitService implements OnModuleInit {
  private config: RateLimitConfig = DEFAULT_CONFIG;
  private keyPrefix: string = 'pardx:ratelimit:';

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    @Optional() private readonly featureFlagService: FeatureFlagService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    const config = this.configService.get<RateLimitConfig>('rateLimit');

    if (config) {
      this.config = {
        ...DEFAULT_CONFIG,
        ...config,
        dimensions: {
          ...DEFAULT_CONFIG.dimensions,
          ...config.dimensions,
        },
        whitelist: {
          ...DEFAULT_CONFIG.whitelist,
          ...config.whitelist,
        },
      };
      this.keyPrefix = config.redis?.keyPrefix || 'pardx:ratelimit:';
    }

    if (enviroment.isProduction()) {
      this.logger.info('RateLimitService module initialized', {
        enabled: this.config.enabled,
        keyPrefix: this.keyPrefix,
        dimensions: Object.keys(this.config.dimensions),
      });
    }
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  /**
   * 检查限流是否启用
   */
  async isEnabled(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    // 通过 Feature Flag 动态控制
    if (this.featureFlagService && this.config.featureFlag) {
      return await this.featureFlagService.isEnabled(this.config.featureFlag);
    }

    return true;
  }

  /**
   * 检查特定 Feature Flag 是否启用
   */
  async isFeatureEnabled(flagName: string): Promise<boolean> {
    if (!this.featureFlagService) {
      return true;
    }
    return await this.featureFlagService.isEnabled(flagName);
  }

  /**
   * 检查是否在白名单中
   */
  isWhitelisted(context: RateLimitContext): boolean {
    const { whitelist } = this.config;

    if (whitelist.ips.includes(context.ip)) {
      return true;
    }

    if (context.userId && whitelist.userIds.includes(context.userId)) {
      return true;
    }

    if (context.apiKey && whitelist.apiKeys.includes(context.apiKey)) {
      return true;
    }

    return false;
  }

  /**
   * 执行限流检查
   *
   * @param context 限流上下文
   * @param options 限流选项
   * @returns 限流检查结果
   */
  async checkRateLimit(
    context: RateLimitContext,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const dimension = options.dimension || this.selectBestDimension(context);
    const identifier = this.getIdentifier(context, dimension);
    const key = this.generateKey(context, options, dimension, identifier);

    // 获取限流配置
    const limit = options.limit || this.getDimensionConfig(dimension).limit;
    const window = options.window || this.getDimensionConfig(dimension).window;

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - window;

    try {
      // 使用 Redis Sorted Set 实现滑动窗口
      const multi = this.redis.redis.multi();

      // 1. 移除过期的记录
      multi.zremrangebyscore(key, 0, windowStart);

      // 2. 获取当前窗口内的请求数
      multi.zcard(key);

      // 3. 添加当前请求 (使用 traceId 确保唯一性)
      multi.zadd(key, now.toString(), `${now}:${context.traceId}`);

      // 4. 设置过期时间
      multi.expire(key, window + 1);

      const results = await multi.exec();

      // zcard 的结果在 results[1][1]
      const currentCount = (results?.[1]?.[1] as number) || 0;
      const allowed = currentCount < limit;

      const result: RateLimitResult = {
        allowed,
        limit,
        remaining: Math.max(0, limit - currentCount - 1),
        resetTime: now + window,
        retryAfter: window,
        dimension,
        identifier,
      };

      // 记录事件
      this.logEvent({
        type: allowed ? 'allowed' : 'blocked',
        traceId: context.traceId,
        dimension,
        identifier,
        path: context.path,
        method: context.method,
        currentCount: currentCount + 1,
        limit,
        userId: context.userId,
        ip: context.ip,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.logger.error('Rate limit check failed', {
        error: error.message,
        key,
        traceId: context.traceId,
      });

      // 降级: Redis 出错时放行请求
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetTime: now + window,
        retryAfter: window,
        dimension,
        identifier,
      };
    }
  }

  /**
   * 获取当前的限流状态 (不增加计数)
   */
  async getRateLimitStatus(
    context: RateLimitContext,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const dimension = options.dimension || this.selectBestDimension(context);
    const identifier = this.getIdentifier(context, dimension);
    const key = this.generateKey(context, options, dimension, identifier);

    const limit = options.limit || this.getDimensionConfig(dimension).limit;
    const window = options.window || this.getDimensionConfig(dimension).window;

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - window;

    try {
      // 只读取当前计数
      await this.redis.redis.zremrangebyscore(key, 0, windowStart);
      const currentCount = await this.redis.redis.zcard(key);

      return {
        allowed: currentCount < limit,
        limit,
        remaining: Math.max(0, limit - currentCount),
        resetTime: now + window,
        retryAfter: window,
        dimension,
        identifier,
      };
    } catch (error) {
      this.logger.error('Rate limit status check failed', {
        error: error.message,
        key,
      });

      return {
        allowed: true,
        limit,
        remaining: limit,
        resetTime: now + window,
        retryAfter: window,
        dimension,
        identifier,
      };
    }
  }

  /**
   * 重置限流计数
   */
  async resetRateLimit(
    context: RateLimitContext,
    options: RateLimitOptions,
  ): Promise<void> {
    const dimension = options.dimension || this.selectBestDimension(context);
    const identifier = this.getIdentifier(context, dimension);
    const key = this.generateKey(context, options, dimension, identifier);

    try {
      await this.redis.redis.del(key);
      this.logger.info('Rate limit reset', {
        key,
        dimension,
        identifier,
      });
    } catch (error) {
      this.logger.error('Rate limit reset failed', {
        error: error.message,
        key,
      });
    }
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * 自动选择最佳限流维度
   * 优先级: apiKey > userId > tenantId > ip
   */
  private selectBestDimension(context: RateLimitContext): RateLimitDimension {
    if (context.apiKey) return 'apiKey';
    if (context.userId) return 'userId';
    if (context.tenantId) return 'tenantId';
    return 'ip';
  }

  /**
   * 获取维度的标识符值
   */
  private getIdentifier(
    context: RateLimitContext,
    dimension: RateLimitDimension,
  ): string {
    switch (dimension) {
      case 'apiKey':
        return context.apiKey || 'unknown';
      case 'userId':
        return context.userId || 'anonymous';
      case 'tenantId':
        return context.tenantId || 'default';
      case 'ip':
      default:
        return context.ip;
    }
  }

  /**
   * 生成 Redis key
   *
   * 格式: {prefix}{dimension}:{identifier}:{normalizedPath}
   * 例如: pardx:ratelimit:userId:user-123:/api/export
   */
  private generateKey(
    context: RateLimitContext,
    options: RateLimitOptions,
    dimension: RateLimitDimension,
    identifier: string,
  ): string {
    // 如果有自定义 keyGenerator，使用它
    if (options.keyGenerator) {
      return `${this.keyPrefix}${options.keyGenerator(context)}`;
    }

    // 规范化路径: 移除 query string，替换 UUID/数字 ID
    const normalizedPath = context.path
      .split('?')[0]
      .replace(/\/[0-9a-f-]{36}/gi, '/:id') // UUID
      .replace(/\/\d+/g, '/:id'); // 数字 ID

    return `${this.keyPrefix}${dimension}:${identifier}:${normalizedPath}`;
  }

  /**
   * 获取维度配置
   */
  private getDimensionConfig(
    dimension: RateLimitDimension,
  ): RateLimitDimensionConfig {
    if (dimension === 'composite') {
      return this.config.default;
    }
    return this.config.dimensions[dimension] || this.config.default;
  }

  /**
   * 记录限流事件
   */
  private logEvent(event: RateLimitEvent): void {
    const logData = {
      type: event.type,
      traceId: event.traceId,
      dimension: event.dimension,
      identifier: event.identifier,
      path: event.path,
      method: event.method,
      count: event.currentCount,
      limit: event.limit,
      userId: event.userId,
      ip: event.ip,
    };

    if (event.type === 'blocked') {
      this.logger.warn('Rate limit exceeded', logData);
    } else {
      // 只在高负载时记录 allowed 事件
      if (event.currentCount >= event.limit * 0.8) {
        this.logger.info('Rate limit approaching', logData);
      }
    }
  }
}
