/**
 * ApiException - Enhanced exception using @repo/contracts
 * 增强版 ApiException，使用 @repo/contracts 中的错误定义
 */

import { HttpException } from '@nestjs/common';
import {
  ApiErrorCode,
  AllErrorTypes,
  getErrorType,
  getHttpStatus,
  getErrorMessage,
} from '@repo/contracts/errors';

// Domain mapping for i18n namespace
const ERROR_DOMAIN_MAP: Record<string, string> = {
  // User errors (2xx)
  '20': 'user',
  '21': 'user',
  // Common errors (9xx)
  '90': 'common',
  '91': 'common',
  '92': 'common',
  '99': 'common',
};

function getDomainFromCode(errorCode: string): string {
  const prefix = errorCode.slice(0, 2);
  return ERROR_DOMAIN_MAP[prefix] || 'common';
}

export class ApiException extends HttpException {
  public readonly errorCode: ApiErrorCode;
  public readonly errorType: string;
  public readonly errorData: unknown;
  public readonly domain: string;

  /**
   * Create exception from error type string (backward compatible)
   * 从错误类型字符串创建异常（向后兼容）
   */
  constructor(errorType: string, data: unknown = null) {
    // Find error code from type
    const entry = Object.entries(AllErrorTypes).find(
      ([, type]) => type === errorType,
    );

    if (!entry) {
      throw new Error(`Unknown error type: ${errorType}`);
    }

    const errorCode = entry[0] as ApiErrorCode;
    const httpStatus = getHttpStatus(errorCode);
    const message = getErrorMessage(errorType);

    super('', httpStatus);

    this.errorCode = errorCode;
    this.errorType = errorType;
    this.errorData = data;
    this.domain = getDomainFromCode(errorCode);
    this.name = 'ApiException';
  }

  /**
   * Create exception from error code (recommended)
   * 从错误码创建异常（推荐方式）
   */
  static fromCode(errorCode: ApiErrorCode, data: unknown = null): ApiException {
    const errorType = getErrorType(errorCode);
    if (!errorType) {
      throw new Error(`Unknown error code: ${errorCode}`);
    }
    return new ApiException(errorType, data);
  }

  /**
   * Get error code
   */
  getErrorCode(): ApiErrorCode {
    return this.errorCode;
  }

  /**
   * Get error message without i18n (fallback)
   */
  getErrorMessageWithoutI18n(): string {
    return getErrorMessage(this.errorType);
  }

  /**
   * Get localized error message using i18n
   * 使用 i18n 获取本地化错误消息
   *
   * Uses namespace: errors.{domain}.{errorType}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getErrorMessage(i18n: any): string {
    // Use errors.{domain}.{errorType} namespace
    const key = `errors.${this.domain}.${this.errorType}`;
    const message = i18n.t(key, { lang: i18n.lang });

    if (message && message !== key) {
      return message;
    }

    // Fallback to error type
    return this.getErrorMessageWithoutI18n() || this.errorType || '';
  }

  /**
   * Get error data
   */
  getErrorData(): unknown {
    return this.errorData;
  }

  /**
   * Get error type
   */
  getErrorType(): string {
    return this.errorType;
  }

  /**
   * Convert to JSON response format
   * 转换为 JSON 响应格式
   *
   * Note: `code` is numeric for backward compatibility
   * `error.errorCode` is string for type safety
   */
  toJSON(): {
    code: number;
    msg: string;
    data: null;
    error: {
      errorCode: string;
      errorType: string;
      errorData: unknown;
    };
  } {
    return {
      code: Number(this.errorCode),
      msg: this.errorType,
      data: null,
      error: {
        errorCode: this.errorCode,
        errorType: this.errorType,
        errorData: this.errorData,
      },
    };
  }
}

/**
 * Helper function to throw ApiException from error code
 * 从错误码抛出 ApiException 的辅助函数
 *
 * @example
 * throw apiError(UserErrorCode.UserNotFound);
 * throw apiError(UserErrorCode.InvalidPassword, { attempts: 3 });
 */
export function apiError(
  errorCode: ApiErrorCode,
  data: unknown = null,
): ApiException {
  return ApiException.fromCode(errorCode, data);
}
