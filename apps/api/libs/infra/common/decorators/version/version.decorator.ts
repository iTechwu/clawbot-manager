/**
 * API Version Decorators
 *
 * 提供 API 版本控制装饰器，支持 Header 和 URI 版本控制。
 * 与当前 api/... 前缀结构兼容，不改变现有路由。
 *
 * 版本控制策略:
 * - 使用 Header: x-api-version 指定版本
 * - 默认版本: 1 (VERSION_NEUTRAL)
 * - 支持版本兼容性检查
 *
 * @example
 * ```typescript
 * // Controller 级别版本控制
 * @Controller('users')
 * @ApiVersion('2')
 * export class UsersV2Controller { ... }
 *
 * // Method 级别版本控制
 * @Get()
 * @ApiVersion(['1', '2'])  // 支持多版本
 * async getUsers() { ... }
 * ```
 */

import { SetMetadata, applyDecorators, Version } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

// ============================================================================
// Constants
// ============================================================================

export const API_VERSION_HEADER = 'x-api-version';
export const DEFAULT_API_VERSION = '1';
export const VERSION_METADATA_KEY = 'api:version';

/**
 * 当前支持的 API 版本列表
 */
export const SUPPORTED_VERSIONS = ['1', '2'] as const;
export type SupportedVersion = (typeof SUPPORTED_VERSIONS)[number];

// ============================================================================
// Decorators
// ============================================================================

/**
 * @ApiVersion - API 版本控制装饰器
 *
 * 使用 NestJS 内置的 @Version 装饰器，配合 Header 版本控制策略。
 *
 * @param version - 版本号或版本号数组
 *
 * @example
 * ```typescript
 * // 单版本
 * @ApiVersion('2')
 * @Controller('users')
 * export class UsersV2Controller { ... }
 *
 * // 多版本兼容
 * @Get()
 * @ApiVersion(['1', '2'])
 * async getUsers() { ... }
 * ```
 */
export function ApiVersion(
  version: SupportedVersion | SupportedVersion[],
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    Version(version),
    SetMetadata(VERSION_METADATA_KEY, version),
    ApiHeader({
      name: API_VERSION_HEADER,
      description: `API 版本号 (支持: ${SUPPORTED_VERSIONS.join(', ')})`,
      required: false,
      schema: {
        type: 'string',
        default: DEFAULT_API_VERSION,
        enum: [...SUPPORTED_VERSIONS],
      },
    }),
  );
}

/**
 * @VersionNeutral - 版本中立装饰器
 *
 * 标记方法或控制器不受版本控制影响，适用于所有版本。
 *
 * @example
 * ```typescript
 * @VersionNeutral()
 * @Get('health')
 * async healthCheck() { ... }
 * ```
 */
export function VersionNeutral(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    Version('neutral' as any), // VERSION_NEUTRAL
    SetMetadata(VERSION_METADATA_KEY, 'neutral'),
  );
}

/**
 * @DeprecatedVersion - 废弃版本警告装饰器
 *
 * 标记即将废弃的 API 版本，会在响应头中添加 Deprecation 警告。
 *
 * @param message - 废弃说明
 * @param sunsetDate - 停止服务日期 (可选)
 *
 * @example
 * ```typescript
 * @DeprecatedVersion('请升级到 v2 API', '2025-06-01')
 * @Get()
 * async getUsers() { ... }
 * ```
 */
export function DeprecatedVersion(
  message: string,
  sunsetDate?: string,
): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    SetMetadata('api:deprecated', { message, sunsetDate })(
      target,
      propertyKey,
      descriptor,
    );
    return descriptor;
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * 检查版本是否受支持
 */
export function isSupportedVersion(
  version: string,
): version is SupportedVersion {
  return SUPPORTED_VERSIONS.includes(version as SupportedVersion);
}

/**
 * 获取版本从请求头
 */
export function getVersionFromRequest(request: any): string {
  return request.headers?.[API_VERSION_HEADER] || DEFAULT_API_VERSION;
}

/**
 * 比较版本号
 * @returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const num1 = parseInt(v1, 10);
  const num2 = parseInt(v2, 10);
  if (num1 < num2) return -1;
  if (num1 > num2) return 1;
  return 0;
}
