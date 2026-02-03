/**
 * useErrorHandler - 统一的错误处理 Hook
 * 提供友好的错误提示和错误分类处理
 */

import { useCallback } from 'react';
import { useOperationFeedback } from './useOperationFeedback';
import { useTranslations } from 'next-intl';

/**
 * 错误类型定义
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * 统一错误处理 Hook
 *
 * @example
 * ```tsx
 * const handleError = useErrorHandler();
 *
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 */
export function useErrorHandler() {
  const { error } = useOperationFeedback();
  const t = useTranslations('errors');

  const handleError = useCallback(
    (err: unknown, customMessage?: string) => {
      // 如果有自定义消息，直接使用
      if (customMessage) {
        error(customMessage);
        return;
      }

      // 根据错误类型显示不同的提示
      if (err instanceof NetworkError) {
        error(
          t('network', {
            defaultValue: '网络连接失败，请检查网络后重试',
          }),
        );
      } else if (err instanceof ValidationError) {
        error(
          t('validation', {
            defaultValue: '输入数据格式不正确，请检查后重试',
          }),
        );
      } else if (err instanceof AuthenticationError) {
        error(
          t('authentication', {
            defaultValue: '登录已过期，请重新登录',
          }),
        );
      } else if (err instanceof PermissionError) {
        error(
          t('permission', {
            defaultValue: '您没有权限执行此操作',
          }),
        );
      } else if (err instanceof Error) {
        // 普通 Error 对象，显示错误消息
        error(
          err.message ||
            t('unknown', {
              defaultValue: '操作失败，请稍后重试',
            }),
        );
      } else {
        // 未知错误类型
        error(
          t('unknown', {
            defaultValue: '操作失败，请稍后重试',
          }),
        );
      }
    },
    [error, t],
  );

  return handleError;
}
