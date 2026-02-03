/**
 * Rate Limit Exception
 *
 * 限流异常类，当请求超过限制时抛出
 * 响应格式与 HttpExceptionFilter 保持一致
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitInfo } from './dto/rate-limit.dto';

/**
 * 限流异常
 *
 * @example
 * throw new RateLimitException({
 *   limit: 100,
 *   remaining: 0,
 *   resetTime: 1703577600,
 *   retryAfter: 60,
 *   dimension: 'userId',
 *   identifier: 'user-123',
 *   endpoint: '/api/export',
 * });
 */
export class RateLimitException extends HttpException {
  public readonly rateLimitInfo: RateLimitInfo;

  constructor(info: RateLimitInfo, message?: string) {
    const errorMessage = message || 'Too many requests, please try again later';

    super(
      {
        code: 925429,
        msg: errorMessage,
        error: {
          limit: info.limit,
          remaining: info.remaining,
          resetTime: info.resetTime,
          retryAfter: info.retryAfter,
          dimension: info.dimension,
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );

    this.rateLimitInfo = info;
  }

  /**
   * 获取限流详情
   */
  getRateLimitInfo(): RateLimitInfo {
    return this.rateLimitInfo;
  }

  /**
   * 获取重试等待时间（秒）
   */
  getRetryAfter(): number {
    return this.rateLimitInfo.retryAfter;
  }

  /**
   * 获取响应头
   */
  getHeaders(): Record<string, string> {
    return {
      'X-RateLimit-Limit': this.rateLimitInfo.limit.toString(),
      'X-RateLimit-Remaining': this.rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': this.rateLimitInfo.resetTime.toString(),
      'Retry-After': this.rateLimitInfo.retryAfter.toString(),
    };
  }
}
