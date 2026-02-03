import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { createTask, getTaskStatus } from '@/lib/actions/task';
import type { CreateTaskRequest, TaskStatusResponse } from '@repo/types';

export type TaskStatus = 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';

export interface UseTaskOptions<TResult = unknown> {
  /**
   * 轮询间隔（毫秒），默认2000ms
   */
  pollingInterval?: number;
  /**
   * 最大轮询次数，默认无限制（0表示无限制）
   */
  maxPollingCount?: number;
  /**
   * 是否自动开始轮询，默认true
   */
  autoPoll?: boolean;
  /**
   * 是否显示Toast提示，默认true
   */
  showToast?: boolean;
  /**
   * 成功回调
   */
  onSuccess?: (result: TResult) => void;
  /**
   * 失败回调
   */
  onFailure?: (error: string) => void;
  /**
   * 进度更新回调
   */
  onProgress?: (progress: unknown) => void;
  /**
   * 状态变化回调
   */
  onStatusChange?: (status: TaskStatus) => void;
  /**
   * 自定义结果解析函数
   */
  parseResult?: (data: TaskStatusResponse) => TResult | null;
  /**
   * 添加任务记录的函数（在任务提交成功后调用）
   */
  addRecord?: (task: CreateTaskRequest, taskId: string | null) => string;
  /**
   * 任务记录ID（用于自动更新记录状态）
   */
  recordId?: string | null;
  /**
   * 更新任务记录的函数
   */
  updateRecord?: (
    id: string,
    updates: Partial<{
      output: TResult | null;
      status: TaskStatus;
      error: string | null;
      taskId: string | null;
    }>,
  ) => void;
  /**
   * 记录ID创建后的回调（用于更新外部状态）
   */
  onRecordCreated?: (recordId: string) => void;
}

export interface UseTaskReturn<TResult = unknown> {
  /**
   * 提交任务
   */
  submitTask: (task: CreateTaskRequest) => Promise<void>;
  /**
   * 手动开始轮询
   */
  startPolling: (taskId: string) => void;
  /**
   * 停止轮询
   */
  stopPolling: () => void;
  /**
   * 重置状态
   */
  reset: () => void;
  /**
   * 任务ID
   */
  taskId: string | null;
  /**
   * 任务状态
   */
  taskStatus: TaskStatus | '';
  /**
   * 是否正在提交
   */
  loading: boolean;
  /**
   * 是否正在轮询
   */
  polling: boolean;
  /**
   * 当前轮询次数
   */
  pollingCount: number;
  /**
   * 进度消息
   */
  progressMessage: string;
  /**
   * 任务结果
   */
  result: TResult | null;
  /**
   * 错误信息
   */
  error: string | null;
  /**
   * 是否达到最大轮询次数
   */
  isMaxPollingReached: boolean;
}

/**
 * 封装任务调用逻辑的React Hook
 *
 * @example
 * ```tsx
 * const { submitTask, taskId, taskStatus, loading, polling, result } = useTask({
 *   onSuccess: (result) => {
 *     console.log('任务成功:', result);
 *   },
 *   onFailure: (error) => {
 *     console.error('任务失败:', error);
 *   }
 * });
 *
 * const handleSubmit = async () => {
 *   await submitTask({
 *     task_name: "pardx.tasks.gen_image.swap_face",
 *     kwargs: { image_urls: ["url1", "url2"] },
 *     queue: "celery-agui"
 *   });
 * };
 * ```
 */
export function useTask<TResult = unknown>(
  options: UseTaskOptions<TResult> = {},
): UseTaskReturn<TResult> {
  const {
    pollingInterval = 2000,
    maxPollingCount = 0,
    autoPoll = true,
    showToast = true,
    onSuccess,
    onFailure,
    onProgress,
    onStatusChange,
    parseResult,
    addRecord,
    recordId,
    updateRecord,
    onRecordCreated,
  } = options;

  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMaxPollingReached, setIsMaxPollingReached] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const pollingCountRef = useRef(0);
  const recordIdRef = useRef<string | null>(recordId || null);
  const updateRecordRef = useRef(updateRecord);
  const addRecordRef = useRef(addRecord);
  const onRecordCreatedRef = useRef(onRecordCreated);

  // 更新 refs 以保持最新值
  useEffect(() => {
    recordIdRef.current = recordId || null;
    updateRecordRef.current = updateRecord;
    addRecordRef.current = addRecord;
    onRecordCreatedRef.current = onRecordCreated;
  }, [recordId, updateRecord, addRecord, onRecordCreated]);

  // 清理轮询
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
    pollingCountRef.current = 0;
    setPolling(false);
    setPollingCount(0);
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    stopPolling();
    setTaskId(null);
    setTaskStatus('');
    setLoading(false);
    setPolling(false);
    setPollingCount(0);
    setProgressMessage('');
    setResult(null);
    setError(null);
    setIsMaxPollingReached(false);
  }, [stopPolling]);

  // 轮询任务状态
  const startPolling = useCallback(
    (id: string) => {
      if (isPollingRef.current) {
        return; // 已经在轮询中
      }

      isPollingRef.current = true;
      pollingCountRef.current = 0;
      setPolling(true);
      setPollingCount(0);
      setIsMaxPollingReached(false);

      const poll = async () => {
        try {
          // 检查是否达到最大轮询次数
          if (
            maxPollingCount > 0 &&
            pollingCountRef.current >= maxPollingCount
          ) {
            stopPolling();
            setIsMaxPollingReached(true);
            const errorMsg = `任务超时：已轮询 ${maxPollingCount} 次仍未完成`;
            setError(errorMsg);
            if (showToast) {
              toast.error(errorMsg);
            }
            if (onFailure) {
              onFailure(errorMsg);
            }
            return;
          }

          pollingCountRef.current++;
          setPollingCount(pollingCountRef.current);

          const data = await getTaskStatus(id);
          const newStatus = data.status as TaskStatus;
          setTaskStatus(newStatus);

          // 更新任务记录状态
          if (recordIdRef.current && updateRecordRef.current) {
            if (newStatus === 'PROGRESS') {
              updateRecordRef.current(recordIdRef.current, {
                status: newStatus,
                taskId: id,
              });
            }
          }

          // 触发状态变化回调
          if (onStatusChange) {
            onStatusChange(newStatus);
          }

          if (data.status === 'SUCCESS') {
            stopPolling();

            // 解析结果
            let parsedResult: TResult | null = null;
            if (parseResult) {
              parsedResult = parseResult(data);
            } else if (data.result) {
              parsedResult = data.result as TResult;
            }

            if (parsedResult !== null) {
              setResult(parsedResult);
            }

            // 更新任务记录为成功状态
            if (recordIdRef.current && updateRecordRef.current) {
              updateRecordRef.current(recordIdRef.current, {
                status: 'SUCCESS',
                output: parsedResult,
                error: null,
                taskId: id,
              });
            }

            setProgressMessage('任务执行成功！');
            if (showToast) {
              toast.success('任务执行成功！');
            }

            if (parsedResult !== null && onSuccess) {
              onSuccess(parsedResult);
            }
          } else if (data.status === 'FAILURE') {
            stopPolling();
            const errorMsg = data.result ? String(data.result) : '未知错误';
            setError(errorMsg);

            // 更新任务记录为失败状态
            if (recordIdRef.current && updateRecordRef.current) {
              updateRecordRef.current(recordIdRef.current, {
                status: 'FAILURE',
                error: errorMsg,
                taskId: id,
              });
            }

            if (showToast) {
              toast.error(`任务执行失败: ${errorMsg}`);
            }

            if (onFailure) {
              onFailure(errorMsg);
            }
          } else if (data.status === 'PROGRESS') {
            // 处理进度信息
            if (data.result) {
              if (onProgress) {
                onProgress(data.result);
              }

              // 尝试解析进度消息
              if (typeof data.result === 'object' && data.result !== null) {
                const resultObj = data.result as Record<string, unknown>;

                // 检查是否有meta对象
                if ('meta' in resultObj) {
                  const meta = resultObj.meta as {
                    current?: number;
                    total?: number;
                    progress?: number;
                    result?: unknown;
                    message?: string;
                  };

                  if (meta.current && meta.total) {
                    setProgressMessage(
                      `处理中: ${meta.current}/${meta.total} (${Math.round(meta.progress || 0)}%)`,
                    );
                  } else if (meta.message) {
                    setProgressMessage(meta.message);
                  }

                  // 如果有部分结果，更新result
                  if (meta.result !== undefined && parseResult) {
                    const partialResult = parseResult({
                      ...data,
                      result: meta.result,
                    });
                    if (partialResult !== null) {
                      setResult(partialResult);
                    }
                  }
                } else if ('message' in resultObj) {
                  setProgressMessage(String(resultObj.message));
                }
              }
            }
          }
        } catch (err) {
          console.error('轮询任务状态失败:', err);
          stopPolling();
          const errorMsg =
            err instanceof Error ? err.message : '查询任务状态失败';
          setError(errorMsg);
          if (showToast) {
            toast.error(errorMsg);
          }

          if (onFailure) {
            onFailure(errorMsg);
          }
        }
      };

      // 立即执行一次
      poll();

      // 设置定时轮询
      intervalRef.current = setInterval(poll, pollingInterval);
    },
    [
      pollingInterval,
      maxPollingCount,
      showToast,
      stopPolling,
      onSuccess,
      onFailure,
      onProgress,
      onStatusChange,
      parseResult,
    ],
  );

  // 提交任务
  const submitTask = useCallback(
    async (task: CreateTaskRequest) => {
      try {
        setLoading(true);
        setResult(null);
        setError(null);
        setProgressMessage('');
        setIsMaxPollingReached(false);

        const data = await createTask(task);
        if (!data.task_id) {
          throw new Error(data.detail || data.message || '任务创建失败');
        }

        setTaskId(data.task_id);
        setTaskStatus(data.status as TaskStatus);

        // 任务提交成功后，创建记录
        if (addRecordRef.current) {
          const newRecordId = addRecordRef.current(task, data.task_id);
          recordIdRef.current = newRecordId;
          // 通知外部更新 recordId
          if (onRecordCreatedRef.current) {
            onRecordCreatedRef.current(newRecordId);
          }
        } else if (recordIdRef.current && updateRecordRef.current) {
          // 如果已经有 recordId，则更新任务ID
          updateRecordRef.current(recordIdRef.current, {
            taskId: data.task_id,
          });
        }

        if (showToast) {
          toast.success('任务创建成功，开始执行...');
        }

        if (autoPoll) {
          startPolling(data.task_id);
        }
      } catch (err) {
        console.error('提交任务失败:', err);
        const errorMsg = err instanceof Error ? err.message : '提交任务失败';
        setError(errorMsg);
        if (showToast) {
          toast.error(errorMsg);
        }

        if (onFailure) {
          onFailure(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    },
    [autoPoll, showToast, startPolling, onFailure],
  );

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    submitTask,
    startPolling,
    stopPolling,
    reset,
    taskId,
    taskStatus,
    loading,
    polling,
    pollingCount,
    progressMessage,
    result,
    error,
    isMaxPollingReached,
  };
}
