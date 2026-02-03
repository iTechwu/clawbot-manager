/**
 * Feature Flag Module
 *
 * 提供功能开关服务的全局模块。
 * 支持 Unleash 集成或自定义 Redis/内存实现。
 */

import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagInterceptor } from './feature-flag.interceptor';

@Global()
@Module({
  imports: [ConfigModule, RedisModule],
  providers: [
    FeatureFlagService,
    {
      provide: APP_INTERCEPTOR,
      useClass: FeatureFlagInterceptor,
    },
  ],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}
