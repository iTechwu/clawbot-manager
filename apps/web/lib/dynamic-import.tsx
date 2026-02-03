'use client';

/**
 * 动态导入工具
 *
 * 提供代码分割和懒加载的工具函数
 * 用于优化首屏加载性能
 */
import dynamic from 'next/dynamic';
import type { ComponentType, ReactNode } from 'react';

/**
 * 加载状态组件
 */
function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );
}

/**
 * 创建懒加载组件
 *
 * @param importFn - 动态导入函数
 * @param options - 配置选项
 * @returns 懒加载的组件
 *
 * @example
 * ```tsx
 * // 基本用法
 * const HeavyChart = createLazyComponent(() => import('@/components/chart'));
 *
 * // 带自定义加载状态
 * const Editor = createLazyComponent(
 *   () => import('@/components/editor'),
 *   { loading: <EditorSkeleton /> }
 * );
 *
 * // 禁用 SSR（用于仅客户端组件）
 * const ClientOnlyMap = createLazyComponent(
 *   () => import('@/components/map'),
 *   { ssr: false }
 * );
 * ```
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: {
    loading?: ReactNode;
    ssr?: boolean;
  } = {},
) {
  const { loading, ssr = true } = options;

  return dynamic(importFn, {
    loading: () => (loading ? <>{loading}</> : <DefaultLoadingComponent />),
    ssr,
  });
}

/**
 * 预加载组件
 *
 * 在用户可能需要组件之前预先加载
 * 例如：鼠标悬停在链接上时预加载目标页面的组件
 *
 * @param importFn - 动态导入函数
 *
 * @example
 * ```tsx
 * const loadEditor = () => import('@/components/editor');
 *
 * // 在鼠标悬停时预加载
 * <button onMouseEnter={() => preloadComponent(loadEditor)}>
 *   打开编辑器
 * </button>
 * ```
 */
export function preloadComponent<T>(
  importFn: () => Promise<T>,
): Promise<T> | void {
  if (typeof window !== 'undefined') {
    return importFn();
  }
}

/**
 * 常用的懒加载组件示例
 *
 * 这些组件通常较大，适合懒加载：
 * - 富文本编辑器
 * - 图表库
 * - 地图组件
 * - 文件预览器
 * - 代码编辑器
 */

// 示例：懒加载图表组件（如果存在）
// export const LazyChart = createLazyComponent(
//   () => import('@/components/chart'),
//   { ssr: false }
// );

// 示例：懒加载编辑器组件（如果存在）
// export const LazyEditor = createLazyComponent(
//   () => import('@/components/editor'),
//   { ssr: false }
// );

// 示例：懒加载文件预览器（如果存在）
// export const LazyFilePreview = createLazyComponent(
//   () => import('@/components/file-preview'),
//   { ssr: false }
// );

export default {
  createLazyComponent,
  preloadComponent,
};
