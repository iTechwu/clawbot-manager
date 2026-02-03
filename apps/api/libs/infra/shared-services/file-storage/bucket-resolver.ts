/**
 * @fileoverview 存储桶解析器
 *
 * 本文件实现了存储桶的智能解析功能，负责：
 * - 根据 IP 地址进行区域感知的存储桶选择
 * - 根据公开/私有属性选择合适的存储桶
 * - 验证存储桶配置的有效性
 *
 * @module file-storage/bucket-resolver
 */

import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FileBucketVendor } from '@prisma/client';

import { PardxUploader } from '@app/clients/internal/file-storage';
import { IpGeoService } from '@app/shared-services/ip-geo';
import { AppConfig } from '@/config/validation';
import arrayUtil from '@/utils/array.util';
import enviromentUtil from '@/utils/enviroment.util';
import { BucketLookupOptions } from './types';

/**
 * 存储桶解析结果
 *
 * @interface BucketResolveResult
 */
export interface BucketResolveResult {
  /** 解析后的存储桶名称 */
  bucket: string;
  /** 解析后的存储供应商 */
  vendor: FileBucketVendor;
  /** 存储桶配置（如果找到） */
  config?: PardxUploader.Config;
}

/**
 * 存储桶解析器
 *
 * @description 负责根据各种条件智能解析存储桶配置。
 *
 * 解析优先级：
 * 1. 如果明确指定了 bucket，验证并使用
 * 2. 根据 IP 地址推断区域（大洲）
 * 3. 根据 isPublic 属性过滤
 * 4. 选择默认存储桶
 *
 * @class BucketResolver
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly resolver: BucketResolver) {}
 *
 *   async getBucket(ip: string) {
 *     const result = await this.resolver.resolve({
 *       ip,
 *       isPublic: false,
 *     });
 *     console.log('Resolved bucket:', result.bucket);
 *   }
 * }
 * ```
 */
@Injectable()
export class BucketResolver {
  /**
   * 存储桶配置列表
   * @private
   */
  private readonly bucketConfigs: PardxUploader.Config[];

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
   * @param {IpGeoService} ipGeoService - IP 地理位置服务（infra 层）
   * @param {Logger} logger - Winston 日志记录器
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly ipGeoService: IpGeoService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.bucketConfigs =
      configService.getOrThrow<PardxUploader.Config[]>('buckets');
    this.appConfig = configService.getOrThrow<AppConfig>('app');
    this.defaultVendor = this.appConfig.defaultVendor;
  }

  /**
   * 解析存储桶
   *
   * @description 根据提供的选项智能解析出最合适的存储桶配置。
   *
   * @param {BucketLookupOptions} options - 查询选项
   * @returns {Promise<BucketResolveResult>} 解析结果
   *
   * @example
   * ```typescript
   * // 根据 IP 解析
   * const result = await resolver.resolve({ ip: '8.8.8.8' });
   *
   * // 指定公开存储桶
   * const result = await resolver.resolve({ isPublic: true });
   *
   * // 明确指定存储桶
   * const result = await resolver.resolve({
   *   vendor: 'oss',
   *   bucket: 'my-bucket',
   * });
   * ```
   */
  async resolve(
    options: BucketLookupOptions = {},
  ): Promise<BucketResolveResult> {
    const { bucket, ip, isPublic, locale, vendor } = options;

    // 确定供应商
    const finalVendor = vendor ?? this.defaultVendor;

    // 如果明确指定了 bucket，验证并返回
    if (bucket) {
      if (this.validateBucket(finalVendor, bucket)) {
        const config = this.findBucketConfig(finalVendor, bucket);
        return { bucket, vendor: finalVendor, config };
      }
      // bucket 无效，继续使用默认逻辑
      this.logger.warn('Invalid bucket specified, falling back to default', {
        bucket,
        vendor: finalVendor,
      });
    }

    // 解析默认存储桶
    const defaultBucket = await this.resolveDefaultBucket(isPublic, ip, locale);
    const resolvedVendor =
      this.getVendorForBucket(defaultBucket) ?? finalVendor;
    const config = this.findBucketConfig(resolvedVendor, defaultBucket);

    return {
      bucket: defaultBucket,
      vendor: resolvedVendor,
      config,
    };
  }

  /**
   * 解析默认存储桶
   *
   * @description 根据公开属性、IP 和区域设置选择默认存储桶。
   *
   * @param {boolean} [isPublic] - 是否公开存储桶
   * @param {string} [ip] - 客户端 IP 地址
   * @param {string} [locale] - 区域设置
   * @returns {Promise<string>} 默认存储桶名称
   */
  async resolveDefaultBucket(
    isPublic?: boolean,
    ip?: string,
    locale?: string,
  ): Promise<string> {
    // 确定区域
    let zone = enviromentUtil.getBaseZone();
    if (ip) {
      const continent = await this.ipGeoService.getContinent(ip);
      zone = continent ?? zone;
    }
    locale = locale ?? zone;

    // 确定公开属性
    const finalIsPublic = isPublic ?? this.appConfig.defaultBucketPublic;

    // 过滤存储桶
    let buckets = arrayUtil.filter(
      this.bucketConfigs,
      { isPublic: finalIsPublic },
      this.appConfig.defaultBucketPublic,
    );
    buckets = arrayUtil.filter(buckets, { locale: locale }, zone);

    // 查找默认存储桶
    const bucketConfig = arrayUtil.findOne(buckets, { isDefault: true }, false);

    if (bucketConfig?.bucket) {
      return bucketConfig.bucket;
    }

    // 回退到区域配置的默认存储桶
    const zoneConfig = this.appConfig.zones?.find((z) => z.zone === zone);
    return finalIsPublic
      ? (zoneConfig?.defaultPublicBucket ?? '')
      : (zoneConfig?.defaultPrivateBucket ?? '');
  }

  /**
   * 验证存储桶是否有效
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @returns {boolean} 是否有效
   */
  validateBucket(vendor: FileBucketVendor, bucket: string): boolean {
    return this.bucketConfigs.some(
      (config) =>
        config.bucket === bucket &&
        (config.vendor ?? this.defaultVendor) === vendor,
    );
  }

  /**
   * 根据存储桶名称获取供应商
   *
   * @param {string} bucket - 存储桶名称
   * @returns {FileBucketVendor | undefined} 供应商或 undefined
   */
  getVendorForBucket(bucket: string): FileBucketVendor | undefined {
    const config = this.bucketConfigs.find((c) => c.bucket === bucket);
    return config?.vendor ?? this.defaultVendor;
  }

  /**
   * 查找存储桶配置
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @returns {PardxUploader.Config | undefined} 配置或 undefined
   */
  findBucketConfig(
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
   * @returns {PardxUploader.Config[]} 配置列表
   */
  getAllConfigs(): PardxUploader.Config[] {
    return [...this.bucketConfigs];
  }

  /**
   * 根据属性过滤存储桶
   *
   * @param {Partial<PardxUploader.Config>} filter - 过滤条件
   * @returns {PardxUploader.Config[]} 匹配的配置列表
   */
  filterBuckets(filter: Partial<PardxUploader.Config>): PardxUploader.Config[] {
    return this.bucketConfigs.filter((config) => {
      for (const [key, value] of Object.entries(filter)) {
        if (config[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 生成新的文件键
   *
   * @description 根据根路径和扩展名生成唯一的文件键。
   *
   * @param {string} root - 根路径
   * @param {string} ext - 文件扩展名
   * @param {string} [bucket] - 存储桶名称
   * @returns {string} 生成的文件键
   *
   * @example
   * ```typescript
   * const key = resolver.generateFileKey('uploads', 'jpg', 'my-bucket');
   * // 返回: "my-bucket/dev/uploads/1704067200000-abc123.jpg"
   * ```
   */
  generateFileKey(root: string, ext: string, bucket?: string): string {
    const prefix = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const env = enviromentUtil.getEnv();

    if (bucket) {
      return `${bucket}/${env}/${root}/${prefix}.${ext}`;
    }
    return `${env}/${root}/${prefix}.${ext}`;
  }
}
