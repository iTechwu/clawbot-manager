'use client';

/**
 * Query Provider - Enhanced React Query Configuration
 * 增强的 React Query 配置
 *
 * 缓存策略说明：
 * - 默认：5分钟 staleTime，30分钟 gcTime
 * - 权限数据：2分钟（需要较快响应权限变更）
 * - 静态数据：30分钟（角色、部门、模板等）
 * - 知识库数据：1小时（公司信息、品牌、产品等）
 * - 实时数据：30秒（未读消息数等）
 *
 * 知识单元缓存策略：
 * - 知识单元列表/详情：5分钟（频繁访问，可能被编辑）
 * - 知识树结构：15分钟（结构变化较少）
 * - 知识版本历史：15分钟（历史记录稳定）
 * - 合并建议：15分钟（需要定期更新）
 * - 相似知识检测：30分钟（AI分析结果相对稳定）
 * - 智能标签推荐：30分钟（AI分析结果相对稳定）
 * - 贡献者统计：30分钟（统计数据变化较慢）
 * - 质量评估：1小时（评估结果非常稳定）
 * - 过期知识检测：1分钟（需要快速响应）
 */

import type { Query } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { handleApiErrorResponse } from '@/lib/errors';
import { cacheTime, gcTime } from '@/lib/api/cache-config';

// ============================================================================
// 缓存策略配置
// ============================================================================

/**
 * 根据 queryKey 获取差异化的 staleTime
 * 不同类型的数据使用不同的缓存时间
 */
function getStaleTimeByQueryKey(queryKey: readonly unknown[]): number {
  if (!queryKey || queryKey.length === 0) {
    return cacheTime.medium; // 默认 5 分钟
  }

  const firstKey = queryKey[0];

  if (typeof firstKey !== 'string') {
    return cacheTime.medium;
  }

  // 消息相关数据
  if (firstKey === 'messages') {
    const secondKey = queryKey[1];
    if (secondKey === 'unread-count') {
      return cacheTime.realtime; // 30 秒
    }
    return cacheTime.medium; // 5 分钟
  }

  // 默认缓存时间
  return cacheTime.medium;
}

/**
 * 根据 queryKey 获取差异化的 gcTime
 */
function getGcTimeByQueryKey(queryKey: readonly unknown[]): number {
  if (!queryKey || queryKey.length === 0) {
    return gcTime.medium;
  }

  const firstKey = queryKey[0];

  if (typeof firstKey !== 'string') {
    return gcTime.medium;
  }

  // 实时数据使用较短的 gcTime
  if (firstKey === 'messages') {
    const secondKey = queryKey[1];
    if (secondKey === 'unread-count') {
      return gcTime.short; // 5 分钟
    }
  }

  return gcTime.medium;
}

// ============================================================================
// QueryClient 创建
// ============================================================================

/**
 * Create QueryClient with optimized configuration
 * 创建优化配置的 QueryClient
 *
 * React Query v5 支持 staleTime 作为函数动态计算缓存时间，
 * gcTime 使用默认值（需要差异化时在各个 query 中单独设置）
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry configuration with exponential backoff
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 3 times for server errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // 动态缓存策略 - staleTime 支持函数，根据 queryKey 计算
        // gcTime 使用默认值（需要差异化时在各个 query 中单独设置）
        staleTime: (query: Query) => getStaleTimeByQueryKey(query.queryKey),
        gcTime: gcTime.medium, // 默认 30 分钟垃圾回收时间

        // Refetch behavior
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,

        // Don't throw errors by default, handle them in the UI
        throwOnError: false,
      },
      mutations: {
        retry: false,
        onError: (error) => {
          // Handle API errors with domain-specific messages
          if (error && typeof error === 'object' && 'body' in error) {
            const result = handleApiErrorResponse(
              (error as { body: unknown }).body,
            );
            toast.error(result.message || 'Operation failed');
            result.action?.();
          } else if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error('An unexpected error occurred');
          }
        },
      },
    },
  });
}

// Singleton for SSR/SSG to prevent creating multiple clients
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new QueryClient
    return createQueryClient();
  }
  // Browser: reuse the same QueryClient
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// 导出缓存策略函数，供外部使用（如 prefetch）
export { getStaleTimeByQueryKey, getGcTimeByQueryKey };
