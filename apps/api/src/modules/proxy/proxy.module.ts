import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProviderKeyModule, BotModule, BotUsageLogModule } from '@app/db';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './services/proxy.service';
import { KeyringService } from './services/keyring.service';
import { UpstreamService } from './services/upstream.service';
import { EncryptionService } from '../bot-api/services/encryption.service';

/**
 * ProxyModule - API 代理模块
 *
 * 提供 AI 提供商 API 代理功能：
 * - 支持多 vendor (OpenAI, Anthropic, Google, Venice, DeepSeek, Groq)
 * - 基于 tag 的密钥路由
 * - Round-robin 负载均衡
 * - SSE 流式响应支持
 * - 使用日志记录
 */
@Module({
  imports: [
    ConfigModule,
    ProviderKeyModule,
    BotModule,
    BotUsageLogModule,
  ],
  controllers: [ProxyController],
  providers: [
    ProxyService,
    KeyringService,
    UpstreamService,
    EncryptionService,
  ],
  exports: [ProxyService],
})
export class ProxyModule {}
