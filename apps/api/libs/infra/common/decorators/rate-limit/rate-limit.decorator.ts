/**
 * Rate Limit Decorator
 *
 * 限流装饰器，支持方法级别的细粒度限流控制
 *
 * @example
 * // 基础用法: 每分钟 100 次
 * @RateLimit({ limit: 100, window: 60 })
 * async createPost() { ... }
 *
 * // 按用户限流
 * @RateLimit({ limit: 50, window: 60, dimension: 'userId' })
 * async submitFeedback() { ... }
 *
 * // 按租户限流 (适用于 SaaS)
 * @RateLimit({ limit: 1000, window: 60, dimension: 'tenantId' })
 * async batchExport() { ... }
 *
 * // 结合 Feature Flag 动态控制
 * @RateLimit({ limit: 100, window: 60, featureFlag: 'rate-limit-export' })
 * async postExport() { ... }
 */

import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { RateLimitInterceptor } from '../../interceptor/rate-limit/rate-limit.interceptor';
import { RateLimitOptions } from './dto/rate-limit.dto';

// ============================================================================
// Constants
// ============================================================================

export const RATE_LIMIT_KEY = 'rate_limit';
export const SKIP_RATE_LIMIT_KEY = 'skip_rate_limit';

// ============================================================================
// Decorators
// ============================================================================

/**
 * @RateLimit - 限流装饰器
 *
 * 对方法应用限流控制，支持多维度和动态配置
 *
 * @param options - 限流配置选项
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * // 标准限流
 * @RateLimit({ limit: 100, window: 60 })
 * async createPost() { ... }
 *
 * // 按 API Key 限流
 * @RateLimit({ limit: 500, window: 60, dimension: 'apiKey' })
 * async externalApiCall() { ... }
 *
 * // 自定义错误消息
 * @RateLimit({
 *     limit: 10,
 *     window: 60,
 *     dimension: 'userId',
 *     message: '发送消息过于频繁，请稍后再试',
 * })
 * async sendMessage() { ... }
 * ```
 */
export function RateLimit(options: RateLimitOptions): MethodDecorator {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, options),
    UseInterceptors(RateLimitInterceptor),
  );
}

/**
 * @SkipRateLimit - 跳过限流
 *
 * 标记方法跳过业务层限流检查（入口限流仍然生效）
 *
 * @example
 * ```typescript
 * @SkipRateLimit()
 * async healthCheck() { ... }
 * ```
 */
export function SkipRateLimit(): MethodDecorator {
  return SetMetadata(SKIP_RATE_LIMIT_KEY, true);
}

// ============================================================================
// Preset Decorators
// ============================================================================

/**
 * 预设限流策略
 *
 * 提供常用场景的快捷装饰器
 */
export const RateLimitPresets = {
  /**
   * 高频接口: 每分钟 200 次
   * 适用于: 列表查询、搜索
   */
  high: () =>
    RateLimit({
      limit: 200,
      window: 60,
    }),

  /**
   * 标准接口: 每分钟 100 次
   * 适用于: 常规 CRUD 操作
   */
  standard: () =>
    RateLimit({
      limit: 100,
      window: 60,
    }),

  /**
   * 低频接口: 每分钟 20 次
   * 适用于: 创建、更新操作
   */
  low: () =>
    RateLimit({
      limit: 20,
      window: 60,
    }),

  /**
   * 敏感操作: 每分钟 5 次
   * 适用于: 密码修改、邮箱验证
   */
  sensitive: () =>
    RateLimit({
      limit: 5,
      window: 60,
      dimension: 'userId',
      message: '操作过于频繁，请稍后再试',
    }),

  /**
   * API Key 限流: 每分钟 1000 次
   * 适用于: 开放 API
   */
  apiKey: (limit = 1000) =>
    RateLimit({
      limit,
      window: 60,
      dimension: 'apiKey',
    }),

  /**
   * 租户限流: 每分钟 2000 次
   * 适用于: SaaS 多租户场景
   */
  tenant: (limit = 2000) =>
    RateLimit({
      limit,
      window: 60,
      dimension: 'tenantId',
    }),

  /**
   * 严格限流: 每小时 10 次
   * 适用于: 注册、重置密码
   */
  strict: () =>
    RateLimit({
      limit: 10,
      window: 3600,
      dimension: 'ip',
      message: '请求次数已达上限，请稍后再试',
    }),

  /**
   * AI 生成限流: 每分钟 10 次
   * 适用于: AI 内容生成
   */
  aiGeneration: () =>
    RateLimit({
      limit: 10,
      window: 60,
      dimension: 'userId',
      featureFlag: 'rate-limit-ai-generation',
      message: 'AI 生成次数已达上限，请稍后再试',
    }),
};

// ============================================================================
// Convenience Aliases
// ============================================================================

/**
 * @RateLimitHigh - 高频接口限流 (200/分钟)
 */
export const RateLimitHigh = RateLimitPresets.high;

/**
 * @RateLimitStandard - 标准接口限流 (100/分钟)
 */
export const RateLimitStandard = RateLimitPresets.standard;

/**
 * @RateLimitLow - 低频接口限流 (20/分钟)
 */
export const RateLimitLow = RateLimitPresets.low;

/**
 * @RateLimitSensitive - 敏感操作限流 (5/分钟)
 */
export const RateLimitSensitive = RateLimitPresets.sensitive;

/**
 * @RateLimitStrict - 严格限流 (10/小时)
 */
export const RateLimitStrict = RateLimitPresets.strict;
