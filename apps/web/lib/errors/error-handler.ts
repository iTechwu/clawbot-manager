/**
 * Frontend Error Handler
 * 前端错误处理工具
 *
 * Type-safe error handling using @repo/contracts error codes
 */

import type { ApiErrorCode } from '@repo/contracts/errors';
import {
  UserErrorCode,
  CommonErrorCode,
  getErrorType,
} from '@repo/contracts/errors';

/**
 * API Error Response interface
 * API 错误响应接口
 */
export interface ApiErrorResponse {
  code: number;
  msg: string;
  data: null;
  error?: {
    errorCode: string | number;
    errorType: string;
    errorData?: unknown;
  };
}

/**
 * Check if response is an API error
 * 检查响应是否为 API 错误
 */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    (response as ApiErrorResponse).code !== 0
  );
}

/**
 * Get error code from API response
 * 从 API 响应中获取错误码
 */
export function getErrorCode(
  response: ApiErrorResponse,
): string | number | undefined {
  return response.error?.errorCode ?? undefined;
}

/**
 * Error handler result type
 */
export interface ErrorHandlerResult {
  handled: boolean;
  message?: string;
  action?: () => void;
}

/**
 * Create a domain-specific error handler
 * 创建特定域的错误处理器
 *
 * @example
 * const handleUserError = createErrorHandler({
 *   [UserErrorCode.UserNotFound]: {
 *     message: 'User not found',
 *   },
 * });
 */
export function createErrorHandler<T extends string | number>(
  handlers: Partial<
    Record<
      T,
      {
        message?: string;
        action?: () => void;
      }
    >
  >,
) {
  return (errorCode: string | number): ErrorHandlerResult => {
    const handler = handlers[errorCode as T];
    if (handler) {
      return {
        handled: true,
        message: handler.message,
        action: handler.action,
      };
    }
    return { handled: false };
  };
}

/**
 * User error handler
 * 用户错误处理器
 */
export const handleUserError = createErrorHandler<UserErrorCode>({
  [UserErrorCode.UserNotFound]: {
    message: 'User not found',
  },
  [UserErrorCode.InvalidPassword]: {
    message: 'Invalid password',
  },
  [UserErrorCode.InvalidVerifyCode]: {
    message: 'Invalid verification code',
  },
  [UserErrorCode.UserAlreadyExists]: {
    message: 'User already exists',
  },
});

/**
 * Common error handler
 * 通用错误处理器
 */
export const handleCommonError = createErrorHandler<CommonErrorCode>({
  [CommonErrorCode.UnAuthorized]: {
    message: 'Please login to continue',
  },
  [CommonErrorCode.InvalidToken]: {
    message: 'Session expired, please login again',
  },
  [CommonErrorCode.TooFrequent]: {
    message: 'Too many requests, please try again later',
  },
  [CommonErrorCode.InternalServerError]: {
    message: 'Internal server error, please try again later',
  },
});

/**
 * Universal error handler - tries all domain handlers
 * 通用错误处理器 - 尝试所有域的处理器
 */
export function handleApiError(errorCode: string | number): ErrorHandlerResult {
  // Try each domain handler in order
  const handlers = [handleUserError, handleCommonError];

  for (const handler of handlers) {
    const result = handler(errorCode);
    if (result.handled) {
      return result;
    }
  }

  // Default handling for unknown errors
  const errorType = getErrorType(String(errorCode) as ApiErrorCode);
  return {
    handled: false,
    message: errorType ? `Error: ${errorType}` : 'An unknown error occurred',
  };
}

/**
 * Extract and handle error from API response
 * 从 API 响应中提取并处理错误
 *
 * @example
 * const { data, error } = await api.getMembers.query();
 * if (error) {
 *   const result = handleApiErrorResponse(error.body);
 *   toast.error(result.message);
 *   result.action?.();
 * }
 */
export function handleApiErrorResponse(response: unknown): ErrorHandlerResult {
  if (!isApiError(response)) {
    return { handled: false, message: 'Unknown error' };
  }

  const errorCode = getErrorCode(response);
  if (errorCode) {
    return handleApiError(errorCode);
  }

  // Fallback to response message
  return {
    handled: true,
    message: response.msg || 'An error occurred',
  };
}

/**
 * Error code domain checker utilities
 * 错误码域检查工具
 */
export const ErrorDomain = {
  isUserError: (code: number): boolean => code >= 200000 && code < 300000,
  isCommonError: (code: number): boolean => code >= 900000,
} as const;
