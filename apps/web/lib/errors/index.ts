/**
 * Error Handling Module
 * 错误处理模块
 */

export * from './error-handler';
export * from './streaming-asr-errors';
export * from './error-tracking';

// Re-export error codes from contracts for convenience
export {
  ApiErrorCode,
  UserErrorCode,
  CommonErrorCode,
  getErrorType,
  getHttpStatus,
} from '@repo/contracts/errors';
