/**
 * OpenClaw 客户端模块
 */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenClawClient } from './openclaw.client';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120000,
      maxRedirects: 5,
    }),
  ],
  providers: [OpenClawClient],
  exports: [OpenClawClient],
})
export class OpenClawModule {}
