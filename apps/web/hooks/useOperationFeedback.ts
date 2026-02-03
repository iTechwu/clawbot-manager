/**
 * useOperationFeedback - 统一的操作反馈 Hook
 * 提供一致的成功/错误/警告提示
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface ToastOptions {
  duration?: number;
  position?:
    | 'top-left'
    | 'top-right'
    | 'top-center'
    | 'bottom-left'
    | 'bottom-right'
    | 'bottom-center';
}

/**
 * 统一的操作反馈 Hook
 *
 * @example
 * ```tsx
 * const { success, error, warning, info } = useOperationFeedback();
 *
 * success('操作成功');
 * error('操作失败');
 * ```
 */
export function useOperationFeedback() {
  const t = useTranslations('common');

  const defaultOptions: ToastOptions = {
    duration: 3000,
    position: 'top-right',
  };

  const success = useCallback((message: string, options?: ToastOptions) => {
    toast.success(message, {
      ...defaultOptions,
      ...options,
      duration: options?.duration ?? 2000, // 成功提示稍短
    });
  }, []);

  const error = useCallback((message: string, options?: ToastOptions) => {
    toast.error(message, {
      ...defaultOptions,
      ...options,
      duration: options?.duration ?? 4000, // 错误提示稍长
    });
  }, []);

  const warning = useCallback((message: string, options?: ToastOptions) => {
    toast.warning(message, {
      ...defaultOptions,
      ...options,
      duration: options?.duration ?? 3000,
    });
  }, []);

  const info = useCallback((message: string, options?: ToastOptions) => {
    toast.info(message, {
      ...defaultOptions,
      ...options,
      duration: options?.duration ?? 3000,
    });
  }, []);

  const loading = useCallback((message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      ...defaultOptions,
      ...options,
    });
  }, []);

  const promise = useCallback(
    <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: unknown) => string);
      },
      options?: ToastOptions,
    ) => {
      return toast.promise(promise, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
        ...defaultOptions,
        ...options,
      });
    },
    [],
  );

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
  };
}
