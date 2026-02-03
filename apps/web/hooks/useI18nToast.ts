'use client';

import { useCallback } from 'react';
import type { ExternalToast } from 'sonner';
import { toast as sonnerToast } from 'sonner';
import { useTranslations } from 'next-intl';

type ToastValues = Record<string, string | number>;

interface I18nToastOptions extends ExternalToast {
  /** 翻译变量 */
  values?: ToastValues;
  /** 描述文本的翻译键 */
  descriptionKey?: string;
  /** 描述文本的翻译变量 */
  descriptionValues?: ToastValues;
}

/**
 * 国际化 Toast Hook
 *
 * 使用示例:
 * ```tsx
 * const toast = useI18nToast();
 *
 * // 基本用法
 * toast.success('success.saved');
 *
 * // 带变量
 * toast.error('file.fileTooLarge', { values: { fileName: 'test.jpg', maxSize: '10MB' } });
 *
 * // 带描述
 * toast.success('success.saved', {
 *   descriptionKey: 'success.savedDesc',
 *   descriptionValues: { fileName: 'test.jpg', maxSize: '10MB' }
 * });
 *
 * // 直接传文本（非翻译键）
 * toast.successRaw('自定义消息');
 * ```
 */
export function useI18nToast() {
  const tMessages = useTranslations('messages');
  const tErrors = useTranslations('errors');

  /**
   * 获取翻译文本
   * 支持嵌套键，如 'success.saved' 或 'file.uploadFailed'
   */
  const getTranslation = useCallback(
    (
      key: string,
      values?: ToastValues,
      namespace: 'messages' | 'errors' = 'messages',
    ) => {
      const t = namespace === 'messages' ? tMessages : tErrors;
      try {
        return t(key, values);
      } catch {
        // 如果翻译失败，返回原始 key
        console.warn(`[i18n-toast] Missing translation: ${namespace}.${key}`);
        return key;
      }
    },
    [tMessages, tErrors],
  );

  /**
   * 成功提示
   */
  const success = useCallback(
    (key: string, options?: I18nToastOptions) => {
      const { values, descriptionKey, descriptionValues, ...toastOptions } =
        options || {};
      const message = getTranslation(key, values);
      const description = descriptionKey
        ? getTranslation(descriptionKey, descriptionValues)
        : undefined;

      return sonnerToast.success(message, {
        ...toastOptions,
        description,
      });
    },
    [getTranslation],
  );

  /**
   * 错误提示
   */
  const error = useCallback(
    (key: string, options?: I18nToastOptions) => {
      const { values, descriptionKey, descriptionValues, ...toastOptions } =
        options || {};
      // 错误消息优先从 errors 命名空间获取
      const message = getTranslation(key, values, 'errors');
      const description = descriptionKey
        ? getTranslation(descriptionKey, descriptionValues, 'errors')
        : undefined;

      return sonnerToast.error(message, {
        ...toastOptions,
        description,
      });
    },
    [getTranslation],
  );

  /**
   * 警告提示
   */
  const warning = useCallback(
    (key: string, options?: I18nToastOptions) => {
      const { values, descriptionKey, descriptionValues, ...toastOptions } =
        options || {};
      const message = getTranslation(key, values);
      const description = descriptionKey
        ? getTranslation(descriptionKey, descriptionValues)
        : undefined;

      return sonnerToast.warning(message, {
        ...toastOptions,
        description,
      });
    },
    [getTranslation],
  );

  /**
   * 信息提示
   */
  const info = useCallback(
    (key: string, options?: I18nToastOptions) => {
      const { values, descriptionKey, descriptionValues, ...toastOptions } =
        options || {};
      const message = getTranslation(key, values);
      const description = descriptionKey
        ? getTranslation(descriptionKey, descriptionValues)
        : undefined;

      return sonnerToast.info(message, {
        ...toastOptions,
        description,
      });
    },
    [getTranslation],
  );

  /**
   * 加载提示
   */
  const loading = useCallback(
    (key: string, options?: I18nToastOptions) => {
      const { values, descriptionKey, descriptionValues, ...toastOptions } =
        options || {};
      const message = getTranslation(key, values);
      const description = descriptionKey
        ? getTranslation(descriptionKey, descriptionValues)
        : undefined;

      return sonnerToast.loading(message, {
        ...toastOptions,
        description,
      });
    },
    [getTranslation],
  );

  /**
   * Promise 提示（自动处理加载、成功、失败状态）
   */
  const promise = useCallback(
    <T>(
      promiseFn: Promise<T>,
      options: {
        loading: string;
        success: string;
        error: string;
        loadingValues?: ToastValues;
        successValues?: ToastValues;
        errorValues?: ToastValues;
      },
    ) => {
      return sonnerToast.promise(promiseFn, {
        loading: getTranslation(options.loading, options.loadingValues),
        success: getTranslation(options.success, options.successValues),
        error: getTranslation(options.error, options.errorValues, 'errors'),
      });
    },
    [getTranslation],
  );

  /**
   * 关闭指定 toast
   */
  const dismiss = useCallback((toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  }, []);

  // 原始方法（不经过翻译，直接显示传入的文本）
  const successRaw = useCallback(
    (message: string, options?: ExternalToast) =>
      sonnerToast.success(message, options),
    [],
  );

  const errorRaw = useCallback(
    (message: string, options?: ExternalToast) =>
      sonnerToast.error(message, options),
    [],
  );

  const warningRaw = useCallback(
    (message: string, options?: ExternalToast) =>
      sonnerToast.warning(message, options),
    [],
  );

  const infoRaw = useCallback(
    (message: string, options?: ExternalToast) =>
      sonnerToast.info(message, options),
    [],
  );

  return {
    // 国际化方法
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
    // 原始方法（不经过翻译）
    successRaw,
    errorRaw,
    warningRaw,
    infoRaw,
  };
}
