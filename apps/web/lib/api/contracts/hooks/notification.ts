'use client';

/**
 * Notification API Hooks
 * 基于 ts-rest 契约的通知 API Hooks
 *
 * 注意：此文件是脚手架占位符。
 * 实际项目中需要在 @repo/contracts 中定义 notificationContract，
 * 并在 client.ts 中导出 notificationApi 和 notificationClient。
 */

// ============================================================================
// Query Keys
// ============================================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: Record<string, unknown>) =>
    [...notificationKeys.all, 'list', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface NotificationsParams {
  type?: string;
  isRead?: boolean;
  limit?: number;
  page?: number;
}

export interface NotificationsOptions {
  /** 是否启用查询，默认 true，可用于懒加载 */
  enabled?: boolean;
}

// ============================================================================
// Placeholder Hooks
// 这些 hooks 是占位符，需要在实际项目中实现
// ============================================================================

/**
 * 获取通知列表 (占位符)
 * TODO: 实现 notificationContract 后启用
 */
export function useNotifications(
  _params?: NotificationsParams,
  _options?: NotificationsOptions,
) {
  // 占位符实现
  return {
    data: undefined,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
  };
}

/**
 * 标记通知已读 (占位符)
 * TODO: 实现 notificationContract 后启用
 */
export function useMarkNotificationRead() {
  return {
    mutate: (_params: { notificationIds: string[] }) => {},
    mutateAsync: (_params: { notificationIds: string[] }) => Promise.resolve(),
    isLoading: false,
    isPending: false,
  };
}

/**
 * 标记全部通知已读 (占位符)
 * TODO: 实现 notificationContract 后启用
 */
export function useMarkAllNotificationsRead() {
  return {
    mutate: () => {},
    mutateAsync: () => Promise.resolve(),
    isLoading: false,
    isPending: false,
  };
}

/**
 * 删除通知 (占位符)
 * TODO: 实现 notificationContract 后启用
 */
export function useDeleteNotification() {
  return {
    mutate: (_params: { notificationId: string }) => {},
    mutateAsync: (_params: { notificationId: string }) => Promise.resolve(),
    isLoading: false,
    isPending: false,
  };
}
