/**
 * 版本不匹配处理 (前端自愈机制)
 *
 * 当后端返回 HTTP 426 (Upgrade Required) 时，触发自愈流程：
 * 1. 显示更新提示弹窗
 * 2. 用户确认后清除缓存并刷新
 * 3. 获取最新版本的前端资源
 */

import { toast } from 'sonner';

// ============================================================================
// Constants
// ============================================================================

const VERSION_MISMATCH_KEY = 'pardx:version_mismatch_shown';

// ============================================================================
// Error Class
// ============================================================================

/**
 * 版本不匹配错误
 *
 * 当后端返回 426 状态码时抛出此错误
 */
export class VersionMismatchError extends Error {
  /** 最低兼容的构建版本 */
  public minBuild: string | null;

  constructor(minBuild: string | null) {
    super('Client version is outdated');
    this.name = 'VersionMismatchError';
    this.minBuild = minBuild;
  }
}

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * 处理版本不匹配错误
 *
 * @param minBuild 后端要求的最低构建版本
 */
export function handleVersionMismatch(minBuild: string | null): void {
  // 避免重复提示 (同一会话只提示一次)
  if (typeof sessionStorage !== 'undefined') {
    if (sessionStorage.getItem(VERSION_MISMATCH_KEY)) {
      return;
    }
    sessionStorage.setItem(VERSION_MISMATCH_KEY, 'true');
  }

  showUpdateModal({
    title: '发现新版本',
    message: '当前版本已过期，需要刷新页面获取最新版本。',
    minBuild,
    onConfirm: () => {
      clearCacheAndReload();
    },
  });
}

/**
 * 清除缓存并刷新页面
 */
export async function clearCacheAndReload(): Promise<void> {
  // 清除 Service Worker 缓存
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch (error) {
      console.warn('Failed to clear caches:', error);
    }
  }

  // 清除版本不匹配标记
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(VERSION_MISMATCH_KEY);
  }

  // 强制刷新页面 (绕过浏览器缓存)
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

// ============================================================================
// UI Components
// ============================================================================

interface UpdateModalOptions {
  title: string;
  message: string;
  minBuild: string | null;
  onConfirm: () => void;
}

/**
 * 显示更新提示弹窗
 */
function showUpdateModal(options: UpdateModalOptions): void {
  // 使用 sonner toast 显示提示
  // 设置 duration: Infinity 保持显示直到用户操作
  toast.warning(options.title, {
    description: options.message,
    duration: Infinity,
    action: {
      label: '立即刷新',
      onClick: options.onConfirm,
    },
    // 不允许用户关闭
    dismissible: false,
  });
}

// ============================================================================
// HTTP Status Check
// ============================================================================

/**
 * 检查响应是否为版本不兼容错误
 *
 * @param status HTTP 状态码
 * @returns 是否为 426 Upgrade Required
 */
export function isVersionMismatchStatus(status: number): boolean {
  return status === 426;
}

/**
 * 从响应中提取最低兼容版本
 *
 * @param headers 响应头
 * @returns 最低兼容的构建版本
 */
export function getMinBuildFromHeaders(
  headers: Headers | Record<string, string>,
): string | null {
  if (headers instanceof Headers) {
    return headers.get('x-min-app-build');
  }
  return headers['x-min-app-build'] || null;
}
