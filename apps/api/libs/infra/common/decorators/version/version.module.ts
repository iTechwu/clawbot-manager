/**
 * Version Decorator Module
 *
 * 提供 API 版本控制功能的全局模块。
 */

import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { VersionInterceptor } from './version.interceptor';

@Global()
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionInterceptor,
    },
  ],
  exports: [],
})
export class VersionDecoratorModule {}
