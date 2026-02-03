/**
 * API 废弃警告处理
 *
 * 当后端返回废弃响应头时，显示警告通知：
 * - Deprecation: true
 * - X-Deprecation-Message: 废弃原因
 * - Sunset: 下线日期
 */

import { toast } from 'sonner';
import {
  DEPRECATION_HEADER,
  DEPRECATION_MESSAGE_HEADER,
  SUNSET_HEADER,
} from '@repo/constants';

// ============================================================================
// Types
// ============================================================================

export interface DeprecationInfo {
  /** 废弃消息 */
  message: string;
  /** 下线日期 (ISO 8601) */
  sunsetDate: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const DEPRECATION_SHOWN_KEY = 'pardx:deprecation_warnings_shown';
const TOAST_DURATION = 10000; // 10 秒

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 获取已显示警告的 API 路径集合
 */
function getShownWarnings(): Set<string> {
  if (typeof sessionStorage === 'undefined') {
    return new Set();
  }
  try {
    const stored = sessionStorage.getItem(DEPRECATION_SHOWN_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * 记录已显示警告的 API 路径
 */
function markWarningShown(path: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    const shown = getShownWarnings();
    shown.add(path);
    sessionStorage.setItem(DEPRECATION_SHOWN_KEY, JSON.stringify(Array.from(shown)));
  } catch {
    // Ignore storage errors
  }
}

/**
 * 格式化下线日期
 */
function formatSunsetDate(sunsetDate: string): string {
  try {
    const date = new Date(sunsetDate);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return sunsetDate;
  }
}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * 检查响应是否包含废弃标识
 */
export function isDeprecated(headers: Headers): boolean {
  const deprecation = headers.get(DEPRECATION_HEADER);
  return deprecation === 'true';
}

/**
 * 从响应头中提取废弃信息
 */
export function getDeprecationInfo(headers: Headers): DeprecationInfo | null {
  if (!isDeprecated(headers)) {
    return null;
  }

  const message =
    headers.get(DEPRECATION_MESSAGE_HEADER) || '此 API 即将废弃，请尽快迁移';
  const sunsetDate = headers.get(SUNSET_HEADER);

  return { message, sunsetDate };
}

/**
 * 检查并显示废弃警告
 *
 * @param headers 响应头
 * @param path API 路径
 */
export function checkDeprecationWarning(headers: Headers, path: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const info = getDeprecationInfo(headers);
  if (!info) {
    return;
  }

  // 检查是否已显示过该路径的警告
  const shown = getShownWarnings();
  if (shown.has(path)) {
    return;
  }

  // 标记为已显示
  markWarningShown(path);

  // 构建警告消息
  let description = info.message;
  if (info.sunsetDate) {
    description += `\n下线日期: ${formatSunsetDate(info.sunsetDate)}`;
  }

  // 显示警告 Toast
  toast.warning('API 即将废弃', {
    description,
    duration: TOAST_DURATION,
    dismissible: true,
  });
}
