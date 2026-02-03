/**
 * Cache Module
 *
 * 提供缓存装饰器功能的 NestJS 模块。
 * 导入此模块以启用 @Cacheable, @CacheEvict, @CachePut 装饰器。
 */

import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RedisModule } from '@app/redis';
import { CacheInterceptor } from './cache.interceptor';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [],
})
export class CacheDecoratorModule {}
