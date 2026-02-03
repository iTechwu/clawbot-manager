/**
 * Form Utilities - React Hook Form + Zod Integration
 * 表单工具 - React Hook Form + Zod 集成
 */

import type {
  UseFormProps,
  FieldValues,
  UseFormReturn,
  Resolver,
} from 'react-hook-form';
import { useForm as useReactHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodObject, ZodRawShape } from 'zod';
import { z } from 'zod';
import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Enhanced useForm hook with Zod validation
 * 增强的 useForm hook，集成 Zod 验证
 *
 * @example
 * const loginSchema = z.object({
 *   email: z.string().email('Invalid email'),
 *   password: z.string().min(6, 'Password too short'),
 * });
 *
 * const { form, onSubmit } = useForm({
 *   schema: loginSchema,
 *   onSubmit: async (data) => {
 *     await login(data);
 *   },
 * });
 */
export function useForm<
  TShape extends ZodRawShape,
  T extends z.infer<ZodObject<TShape>>,
>({
  schema,
  defaultValues,
  onSubmit,
  onError,
  ...options
}: {
  schema: ZodObject<TShape>;
  defaultValues?: UseFormProps<T>['defaultValues'];
  onSubmit: (data: T) => Promise<void> | void;
  onError?: (error: Error) => void;
} & Omit<UseFormProps<T>, 'resolver' | 'defaultValues'>) {
  const form = useReactHookForm<T>({
    resolver: zodResolver(schema) as unknown as Resolver<T>,
    defaultValues,
    mode: 'onBlur',
    ...options,
  });

  const handleSubmit = useCallback(
    (e?: React.BaseSyntheticEvent) => {
      return form.handleSubmit(
        async (data) => {
          try {
            await onSubmit(data);
          } catch (error) {
            if (onError) {
              onError(error as Error);
            } else if (error instanceof Error) {
              toast.error(error.message);
            }
          }
        },
        (errors) => {
          // Get first error message
          const firstError = Object.values(errors)[0];
          if (firstError?.message) {
            toast.error(firstError.message as string);
          }
        },
      )(e);
    },
    [form, onSubmit, onError],
  );

  return {
    form,
    onSubmit: handleSubmit,
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
  };
}

/**
 * Form field helper type
 * 表单字段辅助类型
 */
export interface FormFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: keyof T;
  label?: string;
  placeholder?: string;
  description?: string;
}

/**
 * Common validation patterns
 * 通用验证模式
 */
export const validationPatterns = {
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  password: z.string().min(6, '密码至少需要6个字符'),
  strongPassword: z
    .string()
    .min(8, '密码至少需要8个字符')
    .regex(/[A-Z]/, '密码需要包含至少一个大写字母')
    .regex(/[a-z]/, '密码需要包含至少一个小写字母')
    .regex(/[0-9]/, '密码需要包含至少一个数字'),
  username: z
    .string()
    .min(2, '用户名至少需要2个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  url: z.string().url('请输入有效的URL'),
  required: z.string().min(1, '此字段为必填'),
};

/**
 * Create a confirmation password validation
 * 创建确认密码验证
 */
export function createPasswordConfirmation(passwordField: string = 'password') {
  return z
    .object({
      [passwordField]: z.string(),
      confirmPassword: z.string(),
    })
    .refine((data) => data[passwordField] === data.confirmPassword, {
      message: '两次输入的密码不一致',
      path: ['confirmPassword'],
    });
}
