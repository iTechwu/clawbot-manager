/**
 * SSE Client Module
 *
 * 纯 Client 模块 - Server-Sent Events 客户端服务
 * 仅使用 Redis 进行消息传递，不依赖数据库
 */
import { Module } from '@nestjs/common';
import { SseClient } from './sse.client';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [RedisModule, ConfigModule],
  providers: [SseClient],
  exports: [SseClient],
})
export class SseModule {}
