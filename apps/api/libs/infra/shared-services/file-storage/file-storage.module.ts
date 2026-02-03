/**
 * @fileoverview 文件存储服务模块
 *
 * 本模块提供文件存储服务的 NestJS 模块配置，整合了：
 * - FileStorageService: 文件存储服务门面
 * - FileStorageClientFactory: 客户端工厂
 * - BucketResolver: 存储桶解析器
 *
 * @module file-storage/module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { IpGeoModule } from '@app/shared-services/ip-geo';
import { RedisModule } from '@app/redis';
import { FileStorageService } from './file-storage.service';
import { FileStorageClientFactory } from './file-storage.factory';
import { BucketResolver } from './bucket-resolver';

/**
 * 文件存储服务模块
 *
 * @description 提供文件存储服务的依赖注入配置。
 *
 * 导出服务：
 * - `FileStorageService`: 文件存储服务统一入口
 * - `FileStorageClientFactory`: 客户端工厂（可选，用于高级场景）
 * - `BucketResolver`: 存储桶解析器（可选，用于高级场景）
 *
 * 依赖模块：
 * - `ConfigModule`: 配置服务
 * - `HttpModule`: HTTP 客户端
 * - `RedisModule`: Redis 缓存
 * - `IpGeoModule`: IP 地理位置服务（用于区域感知，纯 infra 层）
 *
 * @example
 * ```typescript
 * // 在其他模块中导入
 * @Module({
 *   imports: [FileStorageServiceModule],
 * })
 * export class VideoModule {}
 *
 * // 在服务中使用
 * @Injectable()
 * class VideoService {
 *   constructor(private readonly fileStorage: FileStorageService) {}
 *
 *   async upload(file: Buffer, key: string) {
 *     const client = await this.fileStorage.getFileClient('oss', 'my-bucket');
 *     await client.fileUploader(file, { key, bucket: 'my-bucket' });
 *   }
 * }
 * ```
 */
@Module({
  imports: [ConfigModule, RedisModule, IpGeoModule, HttpModule],
  providers: [BucketResolver, FileStorageClientFactory, FileStorageService],
  exports: [FileStorageService, FileStorageClientFactory, BucketResolver],
})
export class FileStorageServiceModule {}
