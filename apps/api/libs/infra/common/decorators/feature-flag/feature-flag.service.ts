/**
 * Feature Flag Service
 *
 * 功能开关服务，支持多种后端实现:
 * - 内存: 开发测试用
 * - Redis: 生产环境分布式
 * - Unleash: 企业级功能管理
 *
 * 配置项 (config.local.yaml):
 * ```yaml
 * featureFlags:
 *   provider: 'redis'  # 'memory' | 'redis' | 'unleash'
 *   unleash:
 *     url: 'http://localhost:4242/api'
 *     appName: 'pardx-api'
 *     instanceId: 'instance-1'
 *   defaultFlags:
 *     new-feature: true
 *     beta-dashboard: false
 * ```
 */

import { Injectable, Inject, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisService } from '@app/redis';
import * as crypto from 'crypto';

import {
  FeatureFlagContext,
  FeatureFlagOptions,
  FeatureFlagStrategy,
} from './feature-flag.decorator';
import enviroment from '@/utils/enviroment.util';

// ============================================================================
// Types
// ============================================================================

export type FeatureFlagProvider = 'memory' | 'redis' | 'unleash';

export interface FeatureFlagRedisConfig {
  keyPrefix?: string;
  defaultTTL?: number;
}

export interface FeatureFlagConfig {
  provider: FeatureFlagProvider;
  redis?: FeatureFlagRedisConfig;
  unleash?: {
    url: string;
    appName: string;
    instanceId?: string;
    refreshInterval?: number;
    metricsInterval?: number;
  };
  defaultFlags?: Record<string, boolean>;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class FeatureFlagService implements OnModuleInit {
  private provider: FeatureFlagProvider = 'memory';
  private memoryFlags: Map<string, boolean> = new Map();
  private unleashClient: any = null;
  private redisKeyPrefix = 'pardx:feature:';
  private redisDefaultTTL = 0; // 0 = never expire

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly redis: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    const config = this.configService.get<FeatureFlagConfig>('featureFlags');

    if (config) {
      this.provider = config.provider || 'memory';

      // 如果配置为 Redis 但 Redis 不可用，降级到内存
      if (this.provider === 'redis' && !this.redis) {
        this.logger.warn(
          'Redis configured but not available, falling back to memory provider',
        );
        this.provider = 'memory';
      }

      // 加载 Redis 配置
      if (config.redis) {
        this.redisKeyPrefix = config.redis.keyPrefix || 'pardx:feature:';
        this.redisDefaultTTL = config.redis.defaultTTL || 0;
      }

      // 加载默认开关
      if (config.defaultFlags) {
        for (const [key, value] of Object.entries(config.defaultFlags)) {
          await this.setFlag(key, value);
        }
      }

      // 初始化 Unleash (如果配置)
      if (this.provider === 'unleash' && config.unleash) {
        await this.initUnleash(config.unleash);
      }
    }

    if (enviroment.isProduction()) {
      this.logger.info('Feature flag service module initialized', {
        provider: this.provider,
        redisKeyPrefix: this.redisKeyPrefix,
        redisDefaultTTL: this.redisDefaultTTL,
        redisAvailable: !!this.redis,
      });
    }
  }

  /**
   * 初始化 Unleash 客户端
   */
  private async initUnleash(
    config: FeatureFlagConfig['unleash'],
  ): Promise<void> {
    try {
      // 动态导入 unleash-client
      const { initialize } = await import('unleash-client');

      this.unleashClient = initialize({
        url: config.url,
        appName: config.appName,
        instanceId: config.instanceId || 'default',
        refreshInterval: config.refreshInterval || 15000,
        metricsInterval: config.metricsInterval || 60000,
      });

      this.unleashClient.on('ready', () => {
        this.logger.info('Unleash client ready');
      });

      this.unleashClient.on('error', (err: Error) => {
        this.logger.error('Unleash error', { error: err.message });
      });
    } catch (error) {
      this.logger.warn('Unleash not available, falling back to Redis/memory', {
        error: error.message,
      });
      this.provider = this.redis ? 'redis' : 'memory';
    }
  }

  /**
   * 检查功能是否启用
   */
  async isEnabled(
    flagName: string,
    context?: FeatureFlagContext,
  ): Promise<boolean> {
    try {
      switch (this.provider) {
        case 'unleash':
          return this.checkUnleash(flagName, context);
        case 'redis':
          return this.checkRedis(flagName);
        case 'memory':
        default:
          return this.memoryFlags.get(flagName) ?? false;
      }
    } catch (error) {
      this.logger.error('Feature flag check error', {
        flagName,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 评估功能开关 (支持策略)
   */
  async evaluate(
    options: FeatureFlagOptions,
    context?: FeatureFlagContext,
  ): Promise<boolean> {
    const { flagName, strategy } = options;

    // 先检查基本开关
    const isEnabled = await this.isEnabled(flagName, context);
    if (!isEnabled) {
      return false;
    }

    // 应用策略
    switch (strategy) {
      case 'userId':
        return this.evaluateUserId(options, context);
      case 'percentage':
        return this.evaluatePercentage(options, context);
      case 'environment':
        return this.evaluateEnvironment(options, context);
      case 'custom':
        return this.evaluateCustom(options, context);
      case 'boolean':
      default:
        return isEnabled;
    }
  }

  /**
   * 设置功能开关
   * @param flagName 功能开关名称
   * @param enabled 是否启用
   * @param ttl 过期时间 (秒), 0=使用默认TTL, -1=永不过期
   */
  async setFlag(
    flagName: string,
    enabled: boolean,
    ttl?: number,
  ): Promise<void> {
    switch (this.provider) {
      case 'redis':
        // 如果 Redis 不可用，降级到内存存储
        if (!this.redis) {
          this.memoryFlags.set(flagName, enabled);
          break;
        }

        const key = `${this.redisKeyPrefix}${flagName}`;
        const value = enabled ? '1' : '0';
        const expireSeconds = ttl ?? this.redisDefaultTTL;

        // 使用 RedisService 的 set 方法，支持过期时间
        if (expireSeconds > 0) {
          await this.redis.set(key, value, { EX: expireSeconds });
        } else {
          await this.redis.set(key, value);
        }
        break;
      case 'memory':
      default:
        this.memoryFlags.set(flagName, enabled);
    }

    this.logger.debug('Feature flag updated', { flagName, enabled, ttl });
  }

  /**
   * 获取所有功能开关
   */
  async getAllFlags(): Promise<Record<string, boolean>> {
    switch (this.provider) {
      case 'redis':
        return this.getAllRedisFlags();
      case 'memory':
      default:
        return Object.fromEntries(this.memoryFlags);
    }
  }

  /**
   * 删除功能开关
   */
  async deleteFlag(flagName: string): Promise<void> {
    switch (this.provider) {
      case 'redis':
        // 如果 Redis 不可用，从内存删除
        if (!this.redis) {
          this.memoryFlags.delete(flagName);
          break;
        }
        await this.redis.del(`${this.redisKeyPrefix}${flagName}`);
        break;
      case 'memory':
      default:
        this.memoryFlags.delete(flagName);
    }

    this.logger.debug('Feature flag deleted', { flagName });
  }

  /**
   * 获取功能开关的 TTL (秒)
   * @returns TTL 秒数, -1=永不过期, -2=不存在
   */
  async getFlagTTL(flagName: string): Promise<number> {
    if (this.provider !== 'redis' || !this.redis) {
      return -1;
    }
    const ttl = await this.redis.ttl(`${this.redisKeyPrefix}${flagName}`);
    return ttl ?? -2;
  }

  /**
   * 设置临时功能开关 (自动过期)
   * @param flagName 功能开关名称
   * @param enabled 是否启用
   * @param ttlSeconds 过期时间 (秒)
   */
  async setTemporaryFlag(
    flagName: string,
    enabled: boolean,
    ttlSeconds: number,
  ): Promise<void> {
    await this.setFlag(flagName, enabled, ttlSeconds);
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private checkUnleash(
    flagName: string,
    context?: FeatureFlagContext,
  ): boolean {
    if (!this.unleashClient) {
      return false;
    }

    const unleashContext = {
      userId: context?.userId,
      sessionId: context?.request?.sessionId,
      remoteAddress: context?.request?.ip,
      properties: context?.properties,
    };

    return this.unleashClient.isEnabled(flagName, unleashContext);
  }

  private async checkRedis(flagName: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    const value = await this.redis.get(`${this.redisKeyPrefix}${flagName}`);
    // RedisService.get 会返回解析后的值，对于字符串 '1' 会返回字符串 '1'
    return value === '1' || value === 1;
  }

  private async getAllRedisFlags(): Promise<Record<string, boolean>> {
    if (!this.redis || !this.redis.redis) {
      return {};
    }

    const flags: Record<string, boolean> = {};
    const pattern = `${this.redisKeyPrefix}*`;
    let cursor = '0';

    do {
      // 使用 redis.redis.scan 因为 RedisService 没有封装 scan 方法
      const result = await this.redis.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = result[0];

      for (const key of result[1]) {
        const value = await this.redis.get(key);
        const flagName = key.replace(this.redisKeyPrefix, '');
        // RedisService.get 会返回解析后的值
        flags[flagName] = value === '1' || value === 1;
      }
    } while (cursor !== '0');

    return flags;
  }

  private evaluateUserId(
    options: FeatureFlagOptions,
    context?: FeatureFlagContext,
  ): boolean {
    // 如果没有用户 ID，返回 false
    if (!context?.userId) {
      return false;
    }
    // 可以在这里添加用户白名单逻辑
    return true;
  }

  private evaluatePercentage(
    options: FeatureFlagOptions,
    context?: FeatureFlagContext,
  ): boolean {
    const { percentage = 0, flagName } = options;
    const identifier = context?.userId || context?.request?.ip || 'anonymous';

    // 使用 hash 确保同一用户始终得到相同结果
    const hash = crypto
      .createHash('md5')
      .update(`${flagName}:${identifier}`)
      .digest('hex');
    const hashNumber = parseInt(hash.substring(0, 8), 16);
    const normalizedValue = (hashNumber % 100) + 1;

    return normalizedValue <= percentage;
  }

  private evaluateEnvironment(
    options: FeatureFlagOptions,
    context?: FeatureFlagContext,
  ): boolean {
    const { environments = [] } = options;
    const currentEnv = context?.environment || process.env.NODE_ENV || 'dev';

    return environments.includes(currentEnv);
  }

  private async evaluateCustom(
    options: FeatureFlagOptions,
    context?: FeatureFlagContext,
  ): Promise<boolean> {
    if (!options.customEvaluator) {
      return true;
    }

    return options.customEvaluator(context);
  }
}
