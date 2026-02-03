/**
 * Unified API Error Codes
 * 统一的 API 错误码枚举 - 聚合所有域的错误码
 *
 * Error Code Format: XXXYYY (string)
 * - XXX: Business domain code (2xx=User, 9xx=Common)
 * - YYY: HTTP status code hint
 */

import {
  UserErrorCode,
  UserErrorTypes,
  UserErrorHttpStatus,
} from './domains/user.errors';
import {
  CommonErrorCode,
  CommonErrorTypes,
  CommonErrorHttpStatus,
} from './domains/common.errors';

// Unified ApiErrorCode (string enum)
export const ApiErrorCode = {
  ...UserErrorCode,
  ...CommonErrorCode,
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

// Unified Error Types mapping (errorCode -> i18n key)
export const AllErrorTypes: Record<string, string> = {
  ...UserErrorTypes,
  ...CommonErrorTypes,
};

// Unified HTTP Status mapping (string error code -> http status)
export const AllErrorHttpStatus: Record<string, number> = {
  ...UserErrorHttpStatus,
  ...CommonErrorHttpStatus,
};

// Get error type (i18n key) by error code
export function getErrorType(errorCode: ApiErrorCode): string | undefined {
  return AllErrorTypes[errorCode];
}

// Get HTTP status by error code
export function getHttpStatus(errorCode: ApiErrorCode): number {
  if (errorCode in AllErrorHttpStatus) {
    return AllErrorHttpStatus[errorCode] ?? 500;
  }
  return 500;
}

// Re-export domain-specific constants for direct usage
export { UserErrorCode, CommonErrorCode };
