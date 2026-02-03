/**
 * Rate Limit DTO
 *
 * 限流模块类型定义
 */

import { FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/**
 * 限流维度
 * - ip: 基于 IP 地址
 * - userId: 基于用户 ID
 * - tenantId: 基于租户/团队 ID
 * - apiKey: 基于 API Key
 * - composite: 复合维度 (自定义)
 */
export type RateLimitDimension =
  | 'ip'
  | 'userId'
  | 'tenantId'
  | 'apiKey'
  | 'composite';

/**
 * 限流上下文
 * 包含请求相关的所有维度信息
 */
export interface RateLimitContext {
  /** 客户端 IP 地址 */
  ip: string;
  /** 用户 ID (已认证用户) */
  userId?: string;
  /** 租户/团队 ID */
  tenantId?: string;
  /** API Key (用于外部 API 调用) */
  apiKey?: string;
  /** 请求路径 */
  path: string;
  /** HTTP 方法 */
  method: string;
  /** 追踪 ID */
  traceId: string;
  /** 原始请求对象 */
  request: FastifyRequest;
}

/**
 * 限流选项
 * 用于 @RateLimit 装饰器配置
 */
export interface RateLimitOptions {
  /** 时间窗口内允许的最大请求数 */
  limit: number;
  /** 时间窗口 (秒) */
  window: number;
  /** 限流维度，默认自动选择最佳维度 */
  dimension?: RateLimitDimension;
  /** 自定义 key 生成器 */
  keyGenerator?: (context: RateLimitContext) => string;
  /** 自定义错误消息 */
  message?: string;
  /** 关联的 Feature Flag，用于动态开关 */
  featureFlag?: string;
  /** 跳过限流的条件判断函数 */
  skip?: (context: RateLimitContext) => boolean | Promise<boolean>;
  /** 是否在限流时抛出异常 (默认 true) */
  throwOnLimit?: boolean;
}

/**
 * 限流检查结果
 */
export interface RateLimitResult {
  /** 请求是否被允许 */
  allowed: boolean;
  /** 时间窗口内的请求限制数 */
  limit: number;
  /** 剩余请求数 */
  remaining: number;
  /** 限流重置时间 (Unix 时间戳，秒) */
  resetTime: number;
  /** 需要等待的秒数 */
  retryAfter: number;
  /** 使用的限流维度 */
  dimension: RateLimitDimension;
  /** 维度标识符 */
  identifier: string;
}

/**
 * 限流信息 (用于异常响应)
 */
export interface RateLimitInfo {
  /** 时间窗口内的请求限制数 */
  limit: number;
  /** 剩余请求数 */
  remaining: number;
  /** 限流重置时间 (Unix 时间戳，秒) */
  resetTime: number;
  /** 需要等待的秒数 */
  retryAfter: number;
  /** 使用的限流维度 */
  dimension: RateLimitDimension;
  /** 维度标识符 */
  identifier: string;
  /** 触发限流的端点 */
  endpoint?: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * 维度限流配置
 */
export interface RateLimitDimensionConfig {
  /** 请求限制数 */
  limit: number;
  /** 时间窗口 (秒) */
  window: number;
}

/**
 * 白名单配置
 */
export interface RateLimitWhitelist {
  /** IP 白名单 */
  ips: string[];
  /** 用户 ID 白名单 */
  userIds: string[];
  /** API Key 白名单 */
  apiKeys: string[];
}

/**
 * Redis 配置
 */
export interface RateLimitRedisConfig {
  /** Redis key 前缀 */
  keyPrefix: string;
}

/**
 * 限流配置 (从 YAML 加载)
 */
export interface RateLimitConfig {
  /** 是否启用限流 */
  enabled: boolean;
  /** 全局 Feature Flag */
  featureFlag?: string;
  /** 默认限流配置 */
  default: RateLimitDimensionConfig;
  /** 各维度的默认配置 */
  dimensions: {
    ip: RateLimitDimensionConfig;
    userId: RateLimitDimensionConfig;
    tenantId: RateLimitDimensionConfig;
    apiKey: RateLimitDimensionConfig;
  };
  /** Redis 配置 */
  redis: RateLimitRedisConfig;
  /** 白名单 */
  whitelist: RateLimitWhitelist;
}

// ============================================================================
// Metrics
// ============================================================================

/**
 * 限流事件 (用于日志和监控)
 */
export interface RateLimitEvent {
  /** 事件类型 */
  type: 'allowed' | 'blocked';
  /** 追踪 ID */
  traceId: string;
  /** 限流维度 */
  dimension: RateLimitDimension;
  /** 维度标识符 */
  identifier: string;
  /** 请求路径 */
  path: string;
  /** HTTP 方法 */
  method: string;
  /** 当前计数 */
  currentCount: number;
  /** 限制数 */
  limit: number;
  /** 用户 ID (如有) */
  userId?: string;
  /** IP 地址 */
  ip: string;
  /** 时间戳 */
  timestamp: Date;
}
