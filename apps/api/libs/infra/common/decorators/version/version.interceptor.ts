/**
 * Version Interceptor
 *
 * 拦截器实现，处理 API 版本控制逻辑：
 * - 添加版本响应头
 * - 处理废弃版本警告
 * - 版本日志记录
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import {
  API_VERSION_HEADER,
  DEFAULT_API_VERSION,
  VERSION_METADATA_KEY,
  SUPPORTED_VERSIONS,
} from './version.decorator';

@Injectable()
export class VersionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const handler = context.getHandler();
    const controller = context.getClass();

    // 获取请求的版本
    const requestVersion =
      request.headers?.[API_VERSION_HEADER] || DEFAULT_API_VERSION;

    // 获取方法或控制器的版本元数据
    const methodVersion = this.reflector.get<string | string[]>(
      VERSION_METADATA_KEY,
      handler,
    );
    const controllerVersion = this.reflector.get<string | string[]>(
      VERSION_METADATA_KEY,
      controller,
    );

    // 获取废弃信息
    const deprecatedInfo = this.reflector.get<{
      message: string;
      sunsetDate?: string;
    }>('api:deprecated', handler);

    // 添加版本响应头
    response.header('x-api-version', requestVersion);
    response.header('x-supported-versions', SUPPORTED_VERSIONS.join(', '));

    // 处理废弃版本警告
    if (deprecatedInfo) {
      response.header('Deprecation', 'true');
      response.header('X-Deprecation-Message', deprecatedInfo.message);
      if (deprecatedInfo.sunsetDate) {
        response.header('Sunset', deprecatedInfo.sunsetDate);
      }

      this.logger.warn('Deprecated API version used', {
        path: request.url,
        method: request.method,
        version: requestVersion,
        message: deprecatedInfo.message,
        sunsetDate: deprecatedInfo.sunsetDate,
      });
    }

    return next.handle().pipe(
      tap(() => {
        // 可选: 记录版本使用日志
        this.logger.debug('API request processed', {
          path: request.url,
          method: request.method,
          version: requestVersion,
          controllerVersion,
          methodVersion,
        });
      }),
    );
  }
}
