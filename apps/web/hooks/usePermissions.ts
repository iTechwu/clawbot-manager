/**
 * Permission Hook
 * 权限检查钩子
 */

import { getUser } from '@/lib/storage';

/**
 * 权限配置
 * 定义模块、资源和操作的权限规则
 */
const PERMISSION_RULES: Record<string, Record<string, Record<string, boolean>>> = {
  // 管理员模块 - 仅管理员可访问
  admin: {
    '*': {
      '*': false, // 默认拒绝，需要 isAdmin
    },
  },
  // Bot 模块 - 所有登录用户可访问
  bot: {
    '*': {
      read: true,
      create: true,
      update: true,
      delete: true,
    },
  },
  // 设置模块 - 所有登录用户可访问
  settings: {
    '*': {
      read: true,
      update: true,
    },
  },
};

export function usePermissions() {
  const hasPermission = (
    module: string,
    resource: string,
    action: string,
  ): boolean => {
    const user = getUser();

    // 未登录用户无权限
    if (!user) {
      return false;
    }

    // 管理员拥有所有权限
    if (user.isAdmin) {
      return true;
    }

    // 检查模块级权限
    const moduleRules = PERMISSION_RULES[module];
    if (!moduleRules) {
      // 未定义的模块默认允许登录用户访问
      return true;
    }

    // 检查资源级权限
    const resourceRules = moduleRules[resource] || moduleRules['*'];
    if (!resourceRules) {
      return true;
    }

    // 检查操作级权限
    const actionPermission = resourceRules[action] ?? resourceRules['*'];
    if (actionPermission === undefined) {
      return true;
    }

    return actionPermission;
  };

  return { hasPermission };
}
