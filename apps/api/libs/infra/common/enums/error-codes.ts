/**
 * Error Codes Bridge File
 * 错误码桥接文件
 *
 * Re-exports error codes from @repo/contracts and provides
 * backward-compatible ErrorMessageEnums for existing code.
 *
 * Migration Guide:
 * - New code: import { UserErrorCode } from '@repo/contracts/errors';
 * - New code: import { apiError } from '@/filter/exception/api.exception';
 */

// Re-export all error codes from @repo/contracts
export {
  ApiErrorCode,
  UserErrorCode,
  CommonErrorCode,
  AllErrorTypes,
  AllErrorHttpStatus,
  getErrorType,
  getHttpStatus,
} from '@repo/contracts/errors';

import { AllErrorTypes, AllErrorHttpStatus } from '@repo/contracts/errors';

/**
 * Error Message Definition Type
 * Note: errorCode is now a string but numeric representation is kept for backward compatibility
 */
export interface ErrorMessageDefinition {
  errorCode: number;
  httpStatus: number;
  message: string;
}

/**
 * Generate ErrorMessageEnums from @repo/contracts
 * 从 @repo/contracts 生成 ErrorMessageEnums
 *
 * This provides backward compatibility with the old error system.
 * The message is just the errorType - actual messages come from i18n.
 */
function generateErrorMessageEnums(): Record<string, ErrorMessageDefinition> {
  const result: Record<string, ErrorMessageDefinition> = {};

  for (const [codeStr, errorType] of Object.entries(AllErrorTypes)) {
    const code = Number(codeStr);
    const httpStatus = AllErrorHttpStatus[codeStr] ?? 200;

    result[errorType] = {
      errorCode: code,
      httpStatus,
      message: errorType, // Message comes from i18n, this is just fallback
    };
  }

  return result;
}

/**
 * ErrorMessageEnums - Backward compatible mapping
 * 向后兼容的错误消息映射
 *
 * @deprecated Use @repo/contracts/errors directly for new code
 */
export const ErrorMessageEnums = generateErrorMessageEnums();

/**
 * Type for ErrorMessageEnums keys
 */
export type ErrorType = keyof typeof ErrorMessageEnums;
