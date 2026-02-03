/**
 * Cache Decorators
 *
 * 提供方法级别的缓存装饰器，与 RedisService 深度融合。
 * 支持配置驱动的缓存策略，使用 config.local.yaml 中的 redis 配置。
 *
 * 支持分层缓存键策略:
 * - 格式: prefix:primaryKey:hash(secondaryParams)
 * - 示例: userInfo:userId:md5(select+include)
 * - 清除时支持前缀匹配: userInfo:userId:* 清除所有变体
 *
 * @example
 * ```typescript
 * // 基础用法 - 使用配置名称
 * @Cacheable('userInfo')
 * async getUserById(userId: string) { ... }
 *
 * // 分层缓存 - 支持不同 select/include 参数的独立缓存
 * @Cacheable('userInfo', {
 *     keyGenerator: hierarchicalKeyGenerator({
 *         primaryKey: (userId) => userId,
 *         secondaryParams: (userId, select, include) => ({ select, include }),
 *     }),
 * })
 * async getUserById(userId: string, select?: any, include?: any) { ... }
 *
 * // 缓存失效 - 清除所有相关缓存
 * @CacheEvict('userInfo', {
 *     keyGenerator: (userId) => userId,
 *     evictByPrefix: true,  // 清除 userInfo:userId:* 所有变体
 * })
 * async updateUser(userId: string, data: any) { ... }
 * ```
 */

import { SetMetadata } from '@nestjs/common';
import * as crypto from 'crypto';

// ============================================================================
// Metadata Keys
// ============================================================================

export const CACHE_METADATA_KEY = 'cache:cacheable';
export const CACHE_EVICT_METADATA_KEY = 'cache:evict';
export const CACHE_PUT_METADATA_KEY = 'cache:put';

// ============================================================================
// Types
// ============================================================================

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** Redis 配置名称 (对应 config.local.yaml 中的 redis[].name) */
  cacheName: string;

  /**
   * 自定义 key 生成器
   * 接收方法参数，返回缓存 key 后缀
   * 默认使用 JSON.stringify(args)
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * 自定义过期时间 (秒)
   * 默认使用配置中的 expireIn
   */
  ttl?: number;

  /**
   * 条件表达式 - 决定是否缓存结果
   * 接收方法返回值，返回 true 则缓存
   * 默认：result !== null && result !== undefined
   */
  condition?: (result: any) => boolean;

  /**
   * 是否同步刷新缓存 (后台更新)
   * 默认: false
   */
  refreshAsync?: boolean;
}

/**
 * 缓存失效配置选项
 */
export interface CacheEvictOptions {
  /** Redis 配置名称 */
  cacheName: string;

  /**
   * 自定义 key 生成器
   * 返回的 key 将用于精确匹配或前缀匹配
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * 是否在方法执行前失效缓存
   * 默认: false (方法执行后失效)
   */
  beforeInvocation?: boolean;

  /**
   * 是否清除所有匹配前缀的缓存
   * 默认: false
   */
  allEntries?: boolean;

  /**
   * 是否使用前缀模式清除缓存
   * 当为 true 时，keyGenerator 返回的 key 将作为前缀，
   * 清除所有以该前缀开头的缓存条目
   *
   * 例如: keyGenerator 返回 "userId123"
   * 将清除: userInfo:userId123, userInfo:userId123:abc, userInfo:userId123:xyz 等
   *
   * 默认: false
   */
  evictByPrefix?: boolean;
}

// ============================================================================
// Decorators
// ============================================================================

/**
 * @Cacheable - 缓存方法返回值
 *
 * 首次调用时执行方法并缓存结果，后续调用直接返回缓存。
 *
 * @param cacheName - Redis 配置名称
 * @param options - 可选配置
 *
 * @example
 * ```typescript
 * @Cacheable('userInfo')
 * async getUserById(userId: string) {
 *     return await this.prisma.userInfo.findUnique({ where: { id: userId } });
 * }
 *
 * ```
 */
export function Cacheable(
  cacheName: string,
  options?: Partial<Omit<CacheOptions, 'cacheName'>>,
): MethodDecorator {
  const cacheOptions: CacheOptions = {
    cacheName,
    ...options,
  };

  return SetMetadata(CACHE_METADATA_KEY, cacheOptions);
}

/**
 * @CacheEvict - 缓存失效
 *
 * 方法执行后（或前）使指定缓存失效。
 *
 * @param cacheName - Redis 配置名称
 * @param options - 可选配置
 *
 * @example
 * ```typescript
 * @CacheEvict('userInfo')
 * async updateUser(userId: string, data: any) {
 *     return await this.prisma.userInfo.update({ where: { id: userId }, data });
 * }
 *
 * @CacheEvict('userInfo', { allEntries: true })
 * async clearAllUserCache() { ... }
 * ```
 */
export function CacheEvict(
  cacheName: string,
  options?: Partial<Omit<CacheEvictOptions, 'cacheName'>>,
): MethodDecorator {
  const evictOptions: CacheEvictOptions = {
    cacheName,
    ...options,
  };

  return SetMetadata(CACHE_EVICT_METADATA_KEY, evictOptions);
}

/**
 * @CachePut - 更新缓存
 *
 * 每次都执行方法，并用返回值更新缓存。
 * 适用于需要确保数据新鲜度的场景。
 *
 * @param cacheName - Redis 配置名称
 * @param options - 可选配置
 *
 * @example
 * ```typescript
 * @CachePut('userInfo')
 * async refreshUserCache(userId: string) {
 *     return await this.prisma.userInfo.findUnique({ where: { id: userId } });
 * }
 * ```
 */
export function CachePut(
  cacheName: string,
  options?: Partial<Omit<CacheOptions, 'cacheName'>>,
): MethodDecorator {
  const cacheOptions: CacheOptions = {
    cacheName,
    ...options,
  };

  return SetMetadata(CACHE_PUT_METADATA_KEY, cacheOptions);
}

// ============================================================================
// Key Generators
// ============================================================================

/**
 * 默认 key 生成器
 * 将方法参数序列化为缓存 key
 */
export function defaultKeyGenerator(...args: any[]): string {
  if (args.length === 0) return '';
  if (args.length === 1) {
    const arg = args[0];
    if (typeof arg === 'string' || typeof arg === 'number') {
      return String(arg);
    }
  }
  return JSON.stringify(args);
}

/**
 * 基于对象属性的 key 生成器
 *
 * @example
 * ```typescript
 * @Cacheable('userInfo', { keyGenerator: objectKeyGenerator('id') })
 * async getUser(user: { id: string; name: string }) { ... }
 * ```
 */
export function objectKeyGenerator(...properties: string[]) {
  return (...args: any[]): string => {
    const obj = args[0];
    if (!obj || typeof obj !== 'object') {
      return defaultKeyGenerator(...args);
    }
    return properties.map((prop) => obj[prop]).join(':');
  };
}

/**
 * 组合 key 生成器
 * 使用冒号连接多个参数
 *
 * @example
 */
export function compositeKeyGenerator(...args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg);
      }
      return String(arg);
    })
    .join(':');
}

// ============================================================================
// Hash Utilities
// ============================================================================

/**
 * 计算对象的 MD5 哈希值
 * 用于生成缓存键中的参数哈希部分
 */
export function hashObject(obj: any): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }
  const str =
    typeof obj === 'string'
      ? obj
      : JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

/**
 * 计算多个参数的组合哈希
 */
export function hashParams(...params: any[]): string {
  const parts = params.map((p) => {
    if (p === null || p === undefined) {
      return 'null';
    }
    return typeof p === 'string'
      ? p
      : JSON.stringify(p, Object.keys(p || {}).sort());
  });
  return crypto
    .createHash('md5')
    .update(parts.join('|'))
    .digest('hex')
    .substring(0, 8);
}

// ============================================================================
// Hierarchical Key Generators
// ============================================================================

/**
 * 分层缓存键生成器配置
 */
export interface HierarchicalKeyConfig {
  /**
   * 主键生成器
   * 返回缓存键的主要标识部分 (如 userId)
   * 这部分将用于前缀匹配清除
   */
  primaryKey: (...args: any[]) => string;

  /**
   * 次要参数提取器
   * 返回需要哈希的次要参数 (如 select, include)
   * 这些参数将被哈希后附加到主键之后
   */
  secondaryParams?: (...args: any[]) => Record<string, any> | null;
}

/**
 * 分层缓存键生成器
 *
 * 生成格式: primaryKey:hash(secondaryParams)
 * 如果没有 secondaryParams 或为空，则只返回 primaryKey
 *
 * @example
 * ```typescript
 * // 用于 getUserById(userId, select?, include?)
 * @Cacheable('userInfo', {
 *     keyGenerator: hierarchicalKeyGenerator({
 *         primaryKey: (userId) => userId,
 *         secondaryParams: (userId, select, include) => ({ select, include }),
 *     }),
 * })
 * async getUserById(userId: string, select?: any, include?: any) { ... }
 *
 * // 生成的 key 示例:
 * // - getUserById('user1') -> 'user1'
 * // - getUserById('user1', { id: true }) -> 'user1:a3f2b1c4'
 * // - getUserById('user1', { id: true, name: true }) -> 'user1:b2c3d4e5'
 * ```
 */
export function hierarchicalKeyGenerator(config: HierarchicalKeyConfig) {
  return (...args: any[]): string => {
    const primaryKey = config.primaryKey(...args);

    if (!config.secondaryParams) {
      return primaryKey;
    }

    const secondary = config.secondaryParams(...args);

    // 如果次要参数为空或所有值都是 undefined/null，只返回主键
    if (
      !secondary ||
      Object.values(secondary).every((v) => v === undefined || v === null)
    ) {
      return primaryKey;
    }

    // 过滤掉 undefined 和 null 的值，然后计算哈希
    const filteredSecondary = Object.fromEntries(
      Object.entries(secondary).filter(
        ([_, v]) => v !== undefined && v !== null,
      ),
    );

    if (Object.keys(filteredSecondary).length === 0) {
      return primaryKey;
    }

    const hash = hashObject(filteredSecondary);
    return `${primaryKey}:${hash}`;
  };
}

/**
 * 简单分层键生成器
 * 第一个参数作为主键，其余参数作为次要参数
 *
 * @example
 * ```typescript
 * @Cacheable('userInfo', { keyGenerator: simpleHierarchicalKeyGenerator })
 * async getUserById(userId: string, select?: any, include?: any) { ... }
 * // 生成: userId:hash(select+include)
 * ```
 */
export function simpleHierarchicalKeyGenerator(...args: any[]): string {
  if (args.length === 0) return '';

  const primaryKey = String(args[0]);

  if (args.length === 1) {
    return primaryKey;
  }

  // 其余参数作为次要参数
  const secondaryArgs = args.slice(1);

  // 如果所有次要参数都是 undefined/null，只返回主键
  if (secondaryArgs.every((arg) => arg === undefined || arg === null)) {
    return primaryKey;
  }

  const hash = hashParams(...secondaryArgs);
  return `${primaryKey}:${hash}`;
}

/**
 * 创建用户缓存键生成器
 * 专门用于 User 相关的缓存
 *
 * @example
 * ```typescript
 * @Cacheable('userInfo', { keyGenerator: userKeyGenerator })
 * async getUserById(userId: string, select?: any, include?: any) { ... }
 * ```
 */
export const userKeyGenerator = simpleHierarchicalKeyGenerator;

/**
 * 创建空间缓存键生成器
 * 专门用于 Space 相关的缓存
 */
export const spaceKeyGenerator = simpleHierarchicalKeyGenerator;
