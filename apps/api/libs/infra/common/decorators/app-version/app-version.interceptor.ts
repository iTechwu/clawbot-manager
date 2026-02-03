/**
 * App Version Interceptor
 *
 * 拦截器实现，在每个响应中添加版本信息头。
 * 前端可以通过这些头检测版本变化。
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AppVersionService } from './app-version.service';

@Injectable()
export class AppVersionInterceptor implements NestInterceptor {
  constructor(private readonly appVersionService: AppVersionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    // 获取版本响应头
    const versionHeaders = this.appVersionService.getVersionHeaders();

    // 添加版本头到响应
    for (const [key, value] of Object.entries(versionHeaders)) {
      response.header(key, value);
    }

    return next.handle();
  }
}
