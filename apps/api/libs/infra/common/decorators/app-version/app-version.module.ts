/**
 * App Version Module
 *
 * 提供应用版本管理和前后端版本一致性检查。
 */

import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppVersionService } from './app-version.service';
import { AppVersionController } from './app-version.controller';
import { AppVersionInterceptor } from './app-version.interceptor';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [AppVersionController],
  providers: [
    AppVersionService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AppVersionInterceptor,
    },
  ],
  exports: [AppVersionService],
})
export class AppVersionModule {}
