/**
 * Rate Limit Module
 *
 * 限流模块，提供依赖注入支持
 *
 * @example
 * ```typescript
 * // 在 AppModule 或功能模块中导入
 * @Module({
 *     imports: [RateLimitModule],
 * })
 * export class AppModule {}
 *
 * // 在 Controller 中使用
 * @Controller('export')
 * export class ExportController {
 *     @Post()
 *     @RateLimit({ limit: 50, window: 60, dimension: 'userId' })
 *     async create() { ... }
 * }
 * ```
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RateLimitService } from './rate-limit.service';
import { RateLimitInterceptor } from '../../interceptor/rate-limit/rate-limit.interceptor';
import { FeatureFlagModule } from '../feature-flag/feature-flag.module';

@Global()
@Module({
  imports: [ConfigModule, FeatureFlagModule],
  providers: [RateLimitService, RateLimitInterceptor],
  exports: [RateLimitService, RateLimitInterceptor],
})
export class RateLimitModule {}
