/**
 * @fileoverview 文件存储客户端工厂
 *
 * 本文件实现了文件存储客户端的工厂模式，负责：
 * - 根据存储供应商类型创建对应的客户端实例
 * - 管理客户端实例的生命周期（单例模式）
 * - 提供统一的客户端获取接口
 *
 * @module file-storage/factory
 */

import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FileBucketVendor } from '@prisma/client';

import {
  FileStorageInterface,
  FileS3Client,
  FileQiniuClient,
  FileGcsClient,
  FileUs3Client,
  FileTosClient,
  PardxUploader,
} from '@app/clients/internal/file-storage';
import { RedisService } from '@app/redis';
import { getKeysConfig } from '@/config/configuration';
import { AppConfig, StorageCredentialsConfig } from '@/config/validation';
import { CommonErrorCode } from '@repo/contracts/errors';
import { apiError } from '@/filter/exception/api.exception';
import {
  StorageClientKey,
  buildStorageClientKey,
  StorageCredentialsMap,
} from './types';
import enviromentUtil from '@/utils/enviroment.util';

/**
 * 存储客户端类类型
 */
type StorageClientClass = new (
  config: PardxUploader.Config,
  storageConfig: StorageCredentialsConfig,
  appConfig: AppConfig,
  redis: RedisService,
  httpService: HttpService,
  logger: Logger,
) => FileStorageInterface;

/**
 * 存储供应商到客户端类的映射
 *
 * @description 目前支持的存储供应商客户端实现。
 * `tencent` 和 `ksyun` 在枚举中定义但尚未实现客户端。
 */
const VENDOR_CLIENT_MAP: Partial<Record<FileBucketVendor, StorageClientClass>> =
  {
    s3: FileS3Client,
    oss: FileS3Client,
    tos: FileTosClient,
    us3: FileUs3Client,
    gcs: FileGcsClient,
    qiniu: FileQiniuClient,
    // tencent: 尚未实现
    // ksyun: 尚未实现
  };

/**
 * 文件存储客户端工厂
 *
 * @description 使用工厂模式管理不同存储供应商的客户端实例。
 *
 * 主要职责：
 * - 根据 vendor 和 bucket 创建对应的客户端实例
 * - 使用单例模式缓存客户端实例，避免重复创建
 * - 统一管理存储配置和凭证
 *
 * 支持的存储供应商：
 * - 's3': AWS S3 兼容存储
 * - 'oss': 阿里云 OSS
 * - 'tos': 火山引擎 TOS
 * - 'us3': UCloud US3
 * - 'gcs': Google Cloud Storage
 * - 'qiniu': 七牛云存储
 *
 * @class FileStorageClientFactory
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly factory: FileStorageClientFactory) {}
 *
 *   async uploadFile(vendor: FileBucketVendor, bucket: string, file: Buffer) {
 *     const client = this.factory.getClient(vendor, bucket);
 *     await client.fileUploader(file, { key: 'path/to/file', bucket });
 *   }
 * }
 * ```
 */
@Injectable()
export class FileStorageClientFactory {
  /**
   * 客户端实例缓存
   * @private
   */
  private readonly clients: Map<StorageClientKey, FileStorageInterface> =
    new Map();

  /**
   * 存储桶配置列表
   * @private
   */
  private readonly bucketConfigs: PardxUploader.Config[];

  /**
   * 存储凭证配置
   * @private
   */
  private readonly storageCredentials: StorageCredentialsMap;

  /**
   * 应用配置
   * @private
   */
  private readonly appConfig: AppConfig;

  /**
   * 默认存储供应商
   * @private
   */
  private readonly defaultVendor: FileBucketVendor;

  /**
   * 构造函数
   *
   * @param {ConfigService} configService - NestJS 配置服务
   * @param {RedisService} redis - Redis 服务
   * @param {HttpService} httpService - HTTP 服务
   * @param {Logger} logger - Winston 日志记录器
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    // 加载配置
    this.bucketConfigs =
      configService.getOrThrow<PardxUploader.Config[]>('buckets');
    this.appConfig = configService.getOrThrow<AppConfig>('app');
    this.defaultVendor = this.appConfig.defaultVendor;
    this.storageCredentials =
      (getKeysConfig()?.storage as StorageCredentialsMap) || {};

    // 预初始化所有配置的客户端
    this.initializeClients();
  }

  /**
   * 预初始化所有配置的存储客户端
   *
   * @private
   */
  private initializeClients(): void {
    for (const config of this.bucketConfigs) {
      const vendor = config.vendor ?? this.defaultVendor;
      try {
        this.createClient(vendor, config);
      } catch (error) {
        this.logger.error('Failed to initialize storage client', {
          vendor,
          bucket: config.bucket,
          error: (error as Error).message,
        });
      }
    }

    if (enviromentUtil.isProduction()) {
      this.logger.info('FileStorageClientFactory module initialized', {
        clientCount: this.clients.size,
        vendors: [...new Set(this.bucketConfigs.map((c) => c.vendor))],
      });
    }
  }

  /**
   * 创建存储客户端实例
   *
   * @private
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {PardxUploader.Config} config - 存储桶配置
   * @returns {FileStorageInterface} 客户端实例
   * @throws {Error} 不支持的供应商类型时抛出异常
   */
  private createClient(
    vendor: FileBucketVendor,
    config: PardxUploader.Config,
  ): FileStorageInterface {
    const ClientClass = VENDOR_CLIENT_MAP[vendor];

    if (!ClientClass) {
      throw apiError(CommonErrorCode.FileServiceUnsupportedVendor);
    }

    const storageConfig = this.storageCredentials[vendor];
    const client = new ClientClass(
      config,
      storageConfig,
      this.appConfig,
      this.redis,
      this.httpService,
      this.logger,
    );

    // 缓存客户端
    const key = buildStorageClientKey(vendor, config.bucket);
    this.clients.set(key, client);

    return client;
  }

  /**
   * 获取存储客户端
   *
   * @description 根据供应商和存储桶获取对应的客户端实例。
   * 如果客户端不存在，将返回 undefined。
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @returns {FileStorageInterface | undefined} 客户端实例或 undefined
   *
   * @example
   * ```typescript
   * const client = factory.getClient('oss', 'my-bucket');
   * if (client) {
   *   await client.uploadFile('/path/to/file', 'key', 'my-bucket');
   * }
   * ```
   */
  getClient(
    vendor: FileBucketVendor,
    bucket: string,
  ): FileStorageInterface | undefined {
    const key = buildStorageClientKey(vendor, bucket);
    return this.clients.get(key);
  }

  /**
   * 获取存储客户端（必须存在）
   *
   * @description 获取客户端实例，如果不存在则抛出异常。
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @returns {FileStorageInterface} 客户端实例
   * @throws {Error} 客户端不存在时抛出异常
   *
   * @example
   * ```typescript
   * const client = factory.getClientOrThrow('oss', 'my-bucket');
   * await client.uploadFile('/path/to/file', 'key', 'my-bucket');
   * ```
   */
  getClientOrThrow(
    vendor: FileBucketVendor,
    bucket: string,
  ): FileStorageInterface {
    const client = this.getClient(vendor, bucket);

    if (!client) {
      throw new Error(
        `File storage client not found for vendor: ${vendor}, bucket: ${bucket}`,
      );
    }

    return client;
  }

  /**
   * 检查客户端是否存在
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @returns {boolean} 是否存在
   */
  hasClient(vendor: FileBucketVendor, bucket: string): boolean {
    const key = buildStorageClientKey(vendor, bucket);
    return this.clients.has(key);
  }

  /**
   * 获取存储桶配置
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @returns {PardxUploader.Config | undefined} 存储桶配置
   */
  getBucketConfig(
    vendor: FileBucketVendor,
    bucket: string,
  ): PardxUploader.Config | undefined {
    return this.bucketConfigs.find(
      (config) =>
        config.bucket === bucket &&
        (config.vendor ?? this.defaultVendor) === vendor,
    );
  }

  /**
   * 获取所有存储桶配置
   *
   * @returns {PardxUploader.Config[]} 存储桶配置列表
   */
  getAllBucketConfigs(): PardxUploader.Config[] {
    return [...this.bucketConfigs];
  }

  /**
   * 获取默认存储供应商
   *
   * @returns {FileBucketVendor} 默认供应商
   */
  getDefaultVendor(): FileBucketVendor {
    return this.defaultVendor;
  }

  /**
   * 获取应用配置
   *
   * @returns {AppConfig} 应用配置
   */
  getAppConfig(): AppConfig {
    return this.appConfig;
  }

  /**
   * 获取所有已初始化的客户端键
   *
   * @returns {StorageClientKey[]} 客户端键列表
   */
  getClientKeys(): StorageClientKey[] {
    return [...this.clients.keys()];
  }
}
