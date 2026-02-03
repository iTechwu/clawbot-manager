/**
 * Rate Limit Interceptor
 *
 * 业务层限流拦截器，与 RateLimitService 和 Feature Flag 集成
 *
 * 特性:
 * - 多维度限流 (IP, userId, tenantId, apiKey)
 * - Feature Flag 动态开关
 * - 白名单跳过
 * - 限流响应头
 * - 结构化日志
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { FastifyRequest, FastifyReply } from 'fastify';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { RateLimitService } from '../../decorators/rate-limit/rate-limit.service';
import { RateLimitException } from '../../decorators/rate-limit/rate-limit.exception';
import {
  RATE_LIMIT_KEY,
  SKIP_RATE_LIMIT_KEY,
} from '../../decorators/rate-limit/rate-limit.decorator';
import {
  RateLimitContext,
  RateLimitOptions,
} from '../../decorators/rate-limit/dto/rate-limit.dto';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly rateLimitService: RateLimitService,
    @Optional()
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // 如果 RateLimitService 未注入，跳过限流
    if (!this.rateLimitService) {
      return next.handle();
    }

    // 检查是否标记跳过限流
    const skipRateLimit = this.reflector.get<boolean>(
      SKIP_RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (skipRateLimit) {
      return next.handle();
    }

    // 获取限流配置
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // 无限流配置，跳过
    if (!options) {
      return next.handle();
    }

    // 检查全局限流是否启用
    const isEnabled = await this.rateLimitService.isEnabled();
    if (!isEnabled) {
      return next.handle();
    }

    // 检查 Feature Flag (端点级)
    if (options.featureFlag) {
      const flagEnabled = await this.rateLimitService.isFeatureEnabled(
        options.featureFlag,
      );
      if (!flagEnabled) {
        this.log('debug', 'Rate limit skipped by feature flag', {
          featureFlag: options.featureFlag,
        });
        return next.handle();
      }
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    // 构建限流上下文
    const rateLimitContext: RateLimitContext = {
      ip: this.extractIp(request),
      userId: this.extractUserId(request),
      apiKey: this.extractApiKey(request),
      path: request.url,
      method: request.method,
      traceId: (request as any).traceId || this.generateTraceId(),
      request,
    };

    // 检查白名单
    if (this.rateLimitService.isWhitelisted(rateLimitContext)) {
      this.log('debug', 'Rate limit skipped by whitelist', {
        ip: rateLimitContext.ip,
        userId: rateLimitContext.userId,
      });
      return next.handle();
    }

    // 检查自定义跳过条件
    if (options.skip) {
      const shouldSkip =
        typeof options.skip === 'function'
          ? await options.skip(rateLimitContext)
          : options.skip;
      if (shouldSkip) {
        return next.handle();
      }
    }

    // 执行限流检查
    const result = await this.rateLimitService.checkRateLimit(
      rateLimitContext,
      options,
    );

    // 设置限流响应头
    reply.header('X-RateLimit-Limit', result.limit.toString());
    reply.header('X-RateLimit-Remaining', result.remaining.toString());
    reply.header('X-RateLimit-Reset', result.resetTime.toString());

    // 限流被触发
    if (!result.allowed) {
      reply.header('Retry-After', result.retryAfter.toString());

      this.log('warn', 'Rate limit exceeded', {
        traceId: rateLimitContext.traceId,
        dimension: result.dimension,
        identifier: result.identifier,
        path: rateLimitContext.path,
        method: rateLimitContext.method,
        limit: result.limit,
        userId: rateLimitContext.userId,
        ip: rateLimitContext.ip,
      });

      throw new RateLimitException(
        {
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
          retryAfter: result.retryAfter,
          dimension: result.dimension,
          identifier: result.identifier,
          endpoint: rateLimitContext.path,
        },
        options.message,
      );
    }

    return next.handle();
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * 提取客户端 IP 地址
   */
  private extractIp(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0])
        .split(',')[0]
        .trim();
    }
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return typeof realIp === 'string' ? realIp : realIp[0];
    }
    return request.ip || '0.0.0.0';
  }

  /**
   * 提取用户 ID
   */
  private extractUserId(request: FastifyRequest): string | undefined {
    const req = request as any;
    return req.user?.id || req.userId || req.user?.userId;
  }

  /**
   * 提取 API Key
   */
  private extractApiKey(request: FastifyRequest): string | undefined {
    const apiKey = request.headers['x-api-key'];
    return typeof apiKey === 'string' ? apiKey : undefined;
  }

  /**
   * 生成 traceId (降级方案)
   */
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 日志记录
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    meta?: Record<string, any>,
  ): void {
    if (this.logger) {
      this.logger.log(level, message, meta);
    }
  }
}
