/**
 * 前端版本配置
 *
 * 用于端到端版本控制，确保前后端版本兼容。
 *
 * 构建版本格式: YYYY.MM.DD-<hash>-g<generation>
 * 示例: 2025.03.18-abcdef-g42
 */

import { API_VERSION_DEFAULT } from '@repo/constants';

// ============================================================================
// Version Configuration
// ============================================================================

/**
 * 前端版本配置
 */
export const APP_VERSION = {
  /** API 版本号 */
  apiVersion: process.env.NEXT_PUBLIC_API_VERSION || API_VERSION_DEFAULT,
  /** 构建版本 (格式: YYYY.MM.DD-hash-gNN) */
  appBuild: process.env.NEXT_PUBLIC_APP_BUILD || 'dev',
} as const;

// ============================================================================
// Utilities
// ============================================================================

/**
 * 从构建版本中提取代际号 (generation)
 *
 * @param buildVersion 构建版本字符串
 * @returns 代际号，如果无法解析则返回 0
 *
 * @example
 * extractGeneration("2025.03.18-abcdef-g42") // => 42
 * extractGeneration("dev") // => 0
 */
export function extractGeneration(buildVersion: string): number {
  const match = buildVersion.match(/-g(\d+)$/);
  const captured = match?.[1];
  return captured ? parseInt(captured, 10) : 0;
}

/**
 * 获取当前前端的代际号
 */
export function getCurrentGeneration(): number {
  return extractGeneration(APP_VERSION.appBuild);
}

/**
 * 比较两个构建版本的代际号
 *
 * @returns 负数表示 a < b, 0 表示相等, 正数表示 a > b
 */
export function compareGenerations(a: string, b: string): number {
  return extractGeneration(a) - extractGeneration(b);
}
