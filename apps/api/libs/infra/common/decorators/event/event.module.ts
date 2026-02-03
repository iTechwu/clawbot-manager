/**
 * Event Decorator Module
 *
 * 提供事件装饰器功能的 NestJS 模块。
 * 导入此模块以启用 @EmitEvent, @EmitEvents 装饰器。
 */

import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventInterceptor } from './event.interceptor';
import { CacheEventHandler } from './handlers/cache-event.handler';
import { CacheDecoratorModule } from '../cache/cache.module';
import { RedisModule } from '@app/redis';

@Global()
@Module({
  imports: [
    CacheDecoratorModule,
    RedisModule,
    EventEmitterModule.forRoot({
      // 通配符支持
      wildcard: true,
      // 分隔符
      delimiter: '.',
      // 新监听器优先
      newListener: false,
      // 移除监听器时触发
      removeListener: false,
      // 最大监听器数量
      maxListeners: 20,
      // 启用详细内存泄漏警告
      verboseMemoryLeak: true,
      // 忽略错误
      ignoreErrors: false,
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: EventInterceptor,
    },
    CacheEventHandler,
  ],
  exports: [CacheEventHandler],
})
export class EventDecoratorModule {}
