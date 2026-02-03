import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

/**
 * Auth 装饰器选项
 */
export interface AuthOptions {
  /**
   * 是否启用 RBAC 权限检查
   * @default true
   */
  enableRbac?: boolean;

  /**
   * 是否启用模块权限检查
   * 启用后会自动检查 @RequireModulePermission 等装饰器配置的权限
   * @default true
   */
  enableModulePermission?: boolean;
}

/**
 * 基础认证装饰器
 * 现在已集成 RBAC 权限检查和模块权限检查功能
 *
 * @deprecated 该装饰器已废弃，请使用新的统一装饰器：
 * - 简单认证: @SimpleAuth()
 * - 只读操作: @ReadOnlyAuth(module, resource)
 * - 管理员权限: @AdminAuth(isSuperAdmin?)
 *
 * 详见文档: apps/api/docs/Controller装饰器优化记录.md
 *
 * @param authType 认证类型：'api' | 'admin'
 * @param guardType Guard类型：'sse' | 'api'
 * @param options 选项对象或布尔值（向后兼容 enableRbac）
 * @returns 装饰器组合
 *
 * @example
 * // ❌ 旧写法（已废弃）
 * @Auth()
 * @RequireModulePermission('recruitment', 'job', 'create')
 *
 * // ✅ 新写法（推荐）
 * @ReadOnlyAuth('recruitment', 'job')
 */
export function Auth(
  authType: 'api' | 'admin' = 'api',
  guardType: 'sse' | 'api' = 'api',
  options: AuthOptions | boolean = {},
) {
  // 向后兼容：如果 options 是布尔值，转换为对象
  const normalizedOptions: AuthOptions =
    typeof options === 'boolean' ? { enableRbac: options } : options;

  const { enableRbac = true, enableModulePermission = true } =
    normalizedOptions;

  return applyDecorators(
    SetMetadata('auths', [authType, guardType]),
    SetMetadata('enableRbac', enableRbac),
    SetMetadata('enableModulePermission', enableModulePermission),
    UseGuards(AuthGuard),
    ApiBearerAuth,
  );
}
