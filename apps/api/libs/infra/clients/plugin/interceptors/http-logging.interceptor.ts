/**
 * HTTP Logging Interceptor
 *
 * 用于记录 HTTP 客户端请求和响应的拦截器
 */
import { Logger } from 'winston';
import { maskUtil } from '@repo/utils';

export interface HttpLogContext {
  clientName: string;
  method: string;
  url: string;
  startTime: number;
}

/**
 * HTTP 日志拦截器配置
 */
export interface HttpLoggingConfig {
  /** 是否记录请求体 */
  logRequestBody?: boolean;
  /** 是否记录响应体 */
  logResponseBody?: boolean;
  /** 响应体最大长度 */
  maxResponseLength?: number;
  /** 敏感字段列表 (会被脱敏) */
  sensitiveFields?: string[];
}

/**
 * 创建 HTTP 日志拦截器
 *
 * @example
 * ```typescript
 * const interceptor = createHttpLoggingInterceptor(logger, {
 *     logRequestBody: true,
 *     sensitiveFields: ['password', 'apiKey'],
 * });
 * ```
 */
export function createHttpLoggingInterceptor(
  logger: Logger,
  config: HttpLoggingConfig = {},
) {
  const {
    logRequestBody = false,
    logResponseBody = false,
    maxResponseLength = 1000,
    sensitiveFields = ['password', 'apiKey', 'secretKey', 'token'],
  } = config;

  /**
   * 脱敏处理 - 使用 @repo/utils 的 maskUtil
   */
  const maskSensitiveData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    return maskUtil.object(data, sensitiveFields);
  };

  /**
   * 截断响应体
   */
  const truncateResponse = (data: any): string => {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    if (str.length > maxResponseLength) {
      return str.substring(0, maxResponseLength) + '...(truncated)';
    }
    return str;
  };

  return {
    /**
     * 记录请求开始
     */
    logRequest(context: HttpLogContext, body?: any): void {
      const logData: any = {
        client: context.clientName,
        method: context.method,
        url: context.url,
      };

      if (logRequestBody && body) {
        logData.body = maskSensitiveData(body);
      }

      logger.info('HTTP Client Request', logData);
    },

    /**
     * 记录响应
     */
    logResponse(
      context: HttpLogContext,
      response: any,
      statusCode: number,
    ): void {
      const duration = Date.now() - context.startTime;

      const logData: any = {
        client: context.clientName,
        method: context.method,
        url: context.url,
        statusCode,
        duration: `${duration}ms`,
      };

      if (logResponseBody && response) {
        logData.response = truncateResponse(response);
      }

      logger.info('HTTP Client Response', logData);
    },

    /**
     * 记录错误
     */
    logError(context: HttpLogContext, error: any): void {
      const duration = Date.now() - context.startTime;

      logger.error('HTTP Client Error', {
        client: context.clientName,
        method: context.method,
        url: context.url,
        duration: `${duration}ms`,
        error: error.message || error,
        statusCode: error.response?.status,
      });
    },
  };
}
