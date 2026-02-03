/**
 * @fileoverview 通用 Python 任务 SSE Hook
 * 适用于所有异步 Python 任务(会议纪要、知识提取、文档向量化等)
 */

import { useEffect, useState } from 'react';
import { API_CONFIG } from '@/config';

export interface PythonTaskResponse {
  taskId: string;
  type: string;
  status:
    | 'pending'
    | 'processing'
    | 'success'
    | 'failed'
    | 'timeout'
    | 'cancelled';
  progress: number;
  currentStep: string;
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UsePythonTaskOptions {
  /**
   * Python 任务 ID
   */
  taskId: string | null;

  /**
   * 进度更新回调
   */
  onProgress?: (progress: number, step: string) => void;

  /**
   * 任务成功回调
   */
  onSuccess?: (result: unknown) => void;

  /**
   * 任务失败回调
   */
  onError?: (error: string) => void;
}

/**
 * 通用 Python 任务 SSE Hook
 *
 * 通过 SSE 实时监听 Python 任务进度和结果
 *
 * @example
 * ```typescript
 * const { status, isConnected } = usePythonTask({
 *   taskId: 'abc-123',
 *   onProgress: (progress, step) => {
 *     console.log(`Progress: ${progress}% - ${step}`);
 *   },
 *   onSuccess: (result) => {
 *     console.log('Task completed:', result);
 *   },
 *   onError: (error) => {
 *     console.error('Task failed:', error);
 *   },
 * });
 * ```
 */
export function usePythonTask({
  taskId,
  onProgress,
  onSuccess,
  onError,
}: UsePythonTaskOptions) {
  const [status, setStatus] = useState<PythonTaskResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    const apiBase = API_CONFIG.baseUrl;
    const eventSource = new EventSource(
      `${apiBase}/python-tasks/${taskId}/stream`,
    );

    eventSource.onopen = () => {
      console.log(`[SSE] Connected to Python task ${taskId}`);
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 跳过 ping 消息
        if (data.t === 'p') {
          return;
        }

        // 处理任务状态消息
        if (data.t === 'm' && data.data) {
          const taskStatus: PythonTaskResponse = data.data;
          setStatus(taskStatus);

          console.log('[SSE] Task status update:', taskStatus);

          // 触发进度回调
          if (onProgress && taskStatus.status === 'processing') {
            onProgress(taskStatus.progress, taskStatus.currentStep);
          }

          // 任务成功
          if (taskStatus.status === 'success') {
            if (onSuccess && taskStatus.result) {
              onSuccess(taskStatus.result);
            }
            eventSource.close();
            setIsConnected(false);
          }

          // 任务失败
          if (
            taskStatus.status === 'failed' ||
            taskStatus.status === 'timeout' ||
            taskStatus.status === 'cancelled'
          ) {
            if (onError && taskStatus.error) {
              onError(taskStatus.error);
            }
            eventSource.close();
            setIsConnected(false);
          }
        }
      } catch (error) {
        console.error('[SSE] Parse error:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setIsConnected(false);
      eventSource.close();
    };

    // 清理函数
    return () => {
      console.log(`[SSE] Disconnecting from Python task ${taskId}`);
      eventSource.close();
      setIsConnected(false);
    };
  }, [taskId, onProgress, onSuccess, onError]);

  return { status, isConnected };
}
