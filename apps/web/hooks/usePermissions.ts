/**
 * Permission Hook
 * 权限检查钩子
 */

export function usePermissions() {
  const hasPermission = (
    _module: string,
    _resource: string,
    _action: string,
  ): boolean => {
    // TODO: Implement permission check logic
    return true;
  };

  return { hasPermission };
}
