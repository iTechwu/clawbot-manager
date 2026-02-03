'use client';

/**
 * useNotificationSSE Hook
 * 使用 SSE (Server-Sent Events) 实时接收通知更新
 *
 * 功能：
 * - 自动连接到 SSE 端点
 * - 接收实时未读消息计数更新
 * - 自动重连机制（指数退避）
 * - 页面可见性感知（隐藏时暂停，显示时恢复）
 *
 * @example
 * ```tsx
 * function NotificationBadge() {
 *   const { unreadCount, isConnected, error } = useNotificationSSE();
 *
 *   return (
 *     <Badge>
 *       {unreadCount > 0 ? unreadCount : null}
 *       {!isConnected && <span className="text-yellow-500">!</span>}
 *     </Badge>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { /*getToken,*/ ensureValidToken, isTokenExpired } from '@/lib/api';
import { notificationKeys } from '@/lib/api/contracts/hooks/notification';
import { API_CONFIG } from '@/config';

const API_BASE_URL = API_CONFIG.baseUrl || '';

interface SSEMessage {
  t: 'm' | 'p'; // 'm' = message, 'p' = ping
  data: {
    total?: number;
    error?: string;
    timestamp?: string;
  };
}

interface UseNotificationSSEOptions {
  /** 是否启用 SSE 连接，默认 true */
  enabled?: boolean;
  /** 初始重连延迟（毫秒），默认 1000 */
  initialRetryDelay?: number;
  /** 最大重连延迟（毫秒），默认 30000 */
  maxRetryDelay?: number;
}

interface UseNotificationSSEReturn {
  /** 未读消息计数 */
  unreadCount: number;
  /** 是否已连接 */
  isConnected: boolean;
  /** 连接错误 */
  error: Error | null;
  /** 手动重连 */
  reconnect: () => void;
  /** 断开连接 */
  disconnect: () => void;
}

export function useNotificationSSE(
  options: UseNotificationSSEOptions = {},
): UseNotificationSSEReturn {
  const {
    enabled = true,
    initialRetryDelay = 1000,
    maxRetryDelay = 30000,
  } = options;

  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryDelayRef = useRef(initialRetryDelay);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  const queryClient = useQueryClient();

  /**
   * 清理函数
   */
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
      tokenCheckIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  /**
   * 连接到 SSE 端点
   */
  const connect = useCallback(async () => {
    // 清理现有连接
    cleanup();

    try {
      // 确保 token 有效（如果过期则自动刷新）
      // 这很重要，因为 access_token 有效期只有 5 分钟
      const token = await ensureValidToken();
      if (!token) {
        setError(new Error('未登录'));
        return;
      }

      // 构建 SSE URL
      // 注意：标准 EventSource 不支持自定义 headers，所以使用 URL 参数传递 token
      // 后端期望的参数名是 access_token（见 auth.guard.ts）
      const sseUrl = new URL(`${API_BASE_URL}/sse/message/unread`);
      sseUrl.searchParams.set('access_token', token);

      const eventSource = new EventSource(sseUrl.toString(), {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        // 重置重试延迟
        retryDelayRef.current = initialRetryDelay;

        // 启动 token 过期检查（每 30 秒检查一次）
        // 如果 token 即将过期（剩余时间少于 1 分钟），主动重连以使用新 token
        if (tokenCheckIntervalRef.current) {
          clearInterval(tokenCheckIntervalRef.current);
        }
        tokenCheckIntervalRef.current = setInterval(() => {
          // 检查 token 是否过期或即将过期
          if (isTokenExpired()) {
            console.log('Token 已过期，重新连接 SSE...');
            // connect 是 async 函数，但这里不需要 await
            connect().catch((err) => {
              console.error('Token 过期后重连失败:', err);
            });
          }
        }, 30000); // 每 30 秒检查一次
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);

          if (message.t === 'm' && message.data) {
            // 收到消息更新
            if (typeof message.data.total === 'number') {
              setUnreadCount(message.data.total);
              // 同时使 React Query 缓存失效，确保数据一致性
              queryClient.invalidateQueries({
                queryKey: notificationKeys.unreadCount(),
              });
            }
          }
          // 忽略 ping 消息 (t === 'p')
        } catch (err) {
          console.error('SSE 消息解析失败:', err);
        }
      };

      eventSource.onerror = (event) => {
        console.log('SSE 连接错误:', event);
        setIsConnected(false);

        // 关闭当前连接
        eventSource.close();
        eventSourceRef.current = null;

        // 如果页面可见且启用了 SSE，尝试重连
        if (isVisibleRef.current && enabled) {
          setError(new Error('连接断开，正在重试...'));

          // 指数退避重连
          retryTimeoutRef.current = setTimeout(() => {
            retryDelayRef.current = Math.min(
              retryDelayRef.current * 2,
              maxRetryDelay,
            );
            // connect 是 async 函数，需要处理 Promise
            connect().catch((err) => {
              console.error('重连失败:', err);
            });
          }, retryDelayRef.current);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('连接失败'));
      setIsConnected(false);
    }
  }, [cleanup, enabled, initialRetryDelay, maxRetryDelay, queryClient]);

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    retryDelayRef.current = initialRetryDelay;
    connect();
  }, [connect, initialRetryDelay]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    cleanup();
    setUnreadCount(0);
    setError(null);
  }, [cleanup]);

  /**
   * 页面可见性变化处理
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';

      if (isVisibleRef.current && enabled && !eventSourceRef.current) {
        // 页面变为可见且没有活跃连接，重新连接
        connect();
      } else if (!isVisibleRef.current && eventSourceRef.current) {
        // 页面变为隐藏，断开连接以节省资源
        cleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, connect, cleanup]);

  /**
   * 初始化连接
   */
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      cleanup();
    }

    return cleanup;
  }, [enabled, connect, cleanup]);

  return {
    unreadCount,
    isConnected,
    error,
    reconnect,
    disconnect,
  };
}

export default useNotificationSSE;
