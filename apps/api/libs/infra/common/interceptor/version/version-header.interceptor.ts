import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyReply } from 'fastify';
import {
  API_VERSION_HEADER,
  SERVER_BUILD_HEADER,
  API_VERSION_DEFAULT,
  API_GENERATION,
} from '@repo/constants';

/**
 * Version Header Interceptor
 * 版本响应头拦截器
 *
 * 功能：
 * 为所有响应添加版本相关的 Header：
 * - X-API-Version: API 版本号
 * - X-Server-Build: 后端构建版本
 *
 * @example
 * ```typescript
 * // 全局注册
 * app.useGlobalInterceptors(new VersionHeaderInterceptor());
 *
 * // 响应头示例
 * // X-API-Version: 1
 * // X-Server-Build: 2025.03.18-abcdef-g42
 * ```
 */
@Injectable()
export class VersionHeaderInterceptor implements NestInterceptor {
  private readonly serverBuild: string;

  constructor() {
    // 从环境变量获取后端构建版本
    // 格式: YYYY.MM.DD-<hash>-g<generation>
    this.serverBuild = process.env.SERVER_BUILD || this.generateDevBuild();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // 设置版本响应头
    response.header(API_VERSION_HEADER, API_VERSION_DEFAULT);
    response.header(SERVER_BUILD_HEADER, this.serverBuild);

    return next.handle();
  }

  /**
   * 生成开发环境的构建版本
   */
  private generateDevBuild(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    return `${date}-dev-g${API_GENERATION}`;
  }
}
