'use client';

import { useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

type FieldKey =
  | 'username'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'currentPassword'
  | 'newPassword'
  | 'phone'
  | 'name'
  | 'title'
  | 'content'
  | 'description'
  | 'code'
  | 'roleName'
  | 'departmentName'
  | 'link';

/**
 * 国际化表单验证 Hook
 *
 * 使用示例:
 * ```tsx
 * const v = useI18nValidation();
 *
 * // 使用预定义验证器
 * const schema = z.object({
 *   email: v.email(),
 *   phone: v.phone(),
 *   password: v.password({ min: 6 }),
 *   username: v.required('username'),
 *   bio: v.string('description', { max: 200 }),
 * });
 *
 * // 自定义验证消息
 * const customSchema = z.object({
 *   title: z.string().min(1, { message: v.getMessage('required', { field: 'title' }) }),
 * });
 * ```
 */
export function useI18nValidation() {
  const t = useTranslations('validation');

  /**
   * 获取字段显示名称
   */
  const getFieldName = useCallback(
    (fieldKey: FieldKey | string): string => {
      try {
        return t(`fields.${fieldKey}`);
      } catch {
        // 如果没有翻译，返回原始 key
        return fieldKey;
      }
    },
    [t],
  );

  /**
   * 获取验证消息
   */
  const getMessage = useCallback(
    (
      messageKey: string,
      params?: { field?: FieldKey | string; min?: number; max?: number },
    ): string => {
      const fieldName = params?.field ? getFieldName(params.field) : '';
      try {
        return t(messageKey, {
          field: fieldName,
          min: params?.min ?? 0,
          max: params?.max ?? 0,
        });
      } catch {
        return messageKey;
      }
    },
    [t, getFieldName],
  );

  /**
   * 必填字符串
   */
  const required = useCallback(
    (fieldKey: FieldKey | string) => {
      return z
        .string()
        .min(1, { message: getMessage('required', { field: fieldKey }) });
    },
    [getMessage],
  );

  /**
   * 字符串（可选长度限制）
   */
  const string = useCallback(
    (fieldKey: FieldKey | string, options?: { min?: number; max?: number }) => {
      let schema = z.string();

      if (options?.min !== undefined) {
        schema = schema.min(options.min, {
          message: getMessage('minLength', {
            field: fieldKey,
            min: options.min,
          }),
        });
      }

      if (options?.max !== undefined) {
        schema = schema.max(options.max, {
          message: getMessage('maxLength', {
            field: fieldKey,
            max: options.max,
          }),
        });
      }

      return schema;
    },
    [getMessage],
  );

  /**
   * 邮箱验证
   */
  const email = useCallback(() => {
    return z.string().email({ message: getMessage('invalidEmail') });
  }, [getMessage]);

  /**
   * 手机号验证（中国大陆格式）
   */
  const phone = useCallback(() => {
    return z
      .string()
      .regex(/^1[3-9]\d{9}$/, { message: getMessage('invalidPhone') });
  }, [getMessage]);

  /**
   * URL 验证
   */
  const url = useCallback(() => {
    return z.string().url({ message: getMessage('invalidUrl') });
  }, [getMessage]);

  /**
   * 密码验证
   */
  const password = useCallback(
    (options?: { min?: number; requireStrong?: boolean }) => {
      const minLength = options?.min ?? 6;
      let schema = z.string().min(minLength, {
        message: getMessage('passwordTooShort', { min: minLength }),
      });

      if (options?.requireStrong) {
        // 要求包含字母和数字
        schema = schema.regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
          message: getMessage('passwordTooWeak'),
        });
      }

      return schema;
    },
    [getMessage],
  );

  /**
   * 数字验证（可选范围限制）
   */
  const number = useCallback(
    (fieldKey: FieldKey | string, options?: { min?: number; max?: number }) => {
      let schema = z.number();

      if (options?.min !== undefined) {
        schema = schema.min(options.min, {
          message: getMessage('min', { field: fieldKey, min: options.min }),
        });
      }

      if (options?.max !== undefined) {
        schema = schema.max(options.max, {
          message: getMessage('max', { field: fieldKey, max: options.max }),
        });
      }

      return schema;
    },
    [getMessage],
  );

  /**
   * 确认密码验证（需要在 refine 中使用）
   */
  const passwordMismatchMessage = useMemo(
    () => getMessage('passwordMismatch'),
    [getMessage],
  );

  return {
    // 获取方法
    getFieldName,
    getMessage,

    // 验证器
    required,
    string,
    email,
    phone,
    url,
    password,
    number,

    // 预定义消息
    passwordMismatchMessage,
  };
}

/**
 * 创建带有密码确认的表单 schema 辅助函数
 *
 * 使用示例:
 * ```tsx
 * const v = useI18nValidation();
 * const schema = createPasswordConfirmSchema(v, {
 *   passwordField: 'password',
 *   confirmField: 'confirmPassword',
 *   minLength: 8,
 * });
 * ```
 */
export function createPasswordConfirmSchema(
  v: ReturnType<typeof useI18nValidation>,
  options: {
    passwordField?: string;
    confirmField?: string;
    minLength?: number;
    requireStrong?: boolean;
  } = {},
) {
  const {
    passwordField = 'password',
    confirmField = 'confirmPassword',
    minLength = 6,
    requireStrong = false,
  } = options;

  return z
    .object({
      [passwordField]: v.password({ min: minLength, requireStrong }),
      [confirmField]: v.required('confirmPassword'),
    })
    .refine((data) => data[passwordField] === data[confirmField], {
      message: v.passwordMismatchMessage,
      path: [confirmField],
    });
}
