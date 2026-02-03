/**
 * File CDN Client Module
 *
 * 纯 Client 模块 - CDN URL 生成服务
 * 用于生成各种 CDN 签名 URL
 */
import { Module } from '@nestjs/common';
import { FileCdnClient } from './file-cdn.client';
import { FileStorageServiceModule } from '@app/shared-services/file-storage';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';
import { CryptModule } from '@app/clients/internal/crypt';

@Module({
  imports: [ConfigModule, RedisModule, FileStorageServiceModule, CryptModule],
  providers: [FileCdnClient],
  exports: [FileCdnClient],
})
export class FileCdnModule {}
