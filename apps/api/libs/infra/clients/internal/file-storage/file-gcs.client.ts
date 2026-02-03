import { Logger } from 'winston';
import { HttpService } from '@nestjs/axios';

import { PardxUploader } from './dto/file.dto';

import { PardxApp } from '@/config/dto/config.dto';
import { StorageCredentialsConfig, AppConfig } from '@/config/validation';
import { isURL } from 'class-validator';
import { FileS3Client } from './file-s3.client';
import {
  Storage as GcsStorage,
  GetSignedUrlConfig,
} from '@google-cloud/storage';
import { RedisService } from '@app/redis';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import enviromentUtil from '@/utils/enviroment.util';

/**
 * Google Cloud Storage Client
 *
 * 职责：仅负责与 Google Cloud Storage API 通信
 * - 不访问数据库
 * - 不包含业务逻辑
 */
export class FileGcsClient extends FileS3Client {
  protected storage: GcsStorage;
  protected urlRedisKey = 'privateDownloadUrl';
  constructor(
    config: PardxUploader.Config,
    storageConfig: StorageCredentialsConfig,
    appConfig: AppConfig,
    redis: RedisService,
    httpService: HttpService,
    logger: Logger,
  ) {
    super(config, storageConfig, appConfig, redis, httpService, logger);
    this.storage = new GcsStorage();
  }

  setClient() {
    const credentials = {
      // 访问密钥ID
      accessKeyId: this.storageConfig.accessKey,
      // 访问密钥
      secretAccessKey: this.storageConfig.secretKey,
    };
    const clientConfig: S3ClientConfig = {
      // 设置凭证
      credentials: credentials,
      // 设置端点
      // endpoint: this.config.endpoint,
      // 设置区域
      region: this.config.region,

      forcePathStyle: true,
    };
    this.externalClient = new S3Client({
      ...clientConfig,
      endpoint: this.config.endpoint,
    });
    if (enviromentUtil.isProduction()) {
      // 创建内部客户端对象
      this.internalClient = new S3Client({
        ...clientConfig,
        endpoint: this.config.internalEndpoint,
      });
    } else {
      this.internalClient = this.externalClient;
    }
  }
  /**
   * 获取私有文件的下载链接
   *
   * @param fileKey 文件键名
   * @param expire 链接过期时间，单位为秒，默认为3600秒
   * @param internal 是否使用内部客户端，默认为false
   * @param bucket 存储桶名称（可选），如果未提供则使用配置中的默认存储桶
   * @returns 返回一个Promise，解析后得到私有文件的下载链接
   */
  async getPrivateDownloadUrl(
    fileKey: string,
    expire?: number,
    internal?: boolean,
    bucket?: string,
  ): Promise<string> {
    if (this.config.isPublic) {
      return `${this.config.domain}/${fileKey}`;
    }
    const url = await this.getPrivateDownloadUrlWithoutCdnEncrypt(
      fileKey,
      expire,
      internal,
      bucket,
    );
    return url;
    // if (this.config?.cdnKeyName && this.config?.cdnPrivateKey) {
    //     const expires = Math.floor(Date.now() / 1000) + 15
    //     const urlToSign = `${url}&Expires=${expires}&KeyName=${this.config.cdnKeyName}`
    //     const signature = createHmac(
    //         'sha1',
    //         Buffer.from(this.config.cdnPrivateKey, 'base64'),
    //     )
    //         .update(urlToSign)
    //         .digest('base64')
    //     return `${urlToSign}&signature=${signature}`
    // }
  }

  async getPrivateDownloadUrlWithoutCdnEncrypt(
    fileKey: string,
    expire?: number,
    internal?: boolean,
    bucket?: string,
  ): Promise<string> {
    const finalBucket = bucket || this.getBucketString();
    const cacheKey = `${finalBucket}:${fileKey}`;
    const redisUrl = await this.redis.getData(this.urlRedisKey, cacheKey);
    if (redisUrl) {
      return redisUrl;
    }
    expire = expire ?? 15;
    const action: 'read' | 'write' | 'delete' | 'resumable' = 'read'; // 获取读取权限
    const version: 'v4' | 'v2' = 'v4'; // 使用V4签名版本
    let options: GetSignedUrlConfig = {
      version,
      action: action,
      expires: Date.now() + expire * 1000, // 链接过期时间
    };
    if (this.config.domain != '' && isURL(this.config.domain)) {
      options = {
        ...options,
        cname: this.config.domain,
      };
    }
    // 获取文件的签名 URL
    const [url] = await this.storage
      .bucket(finalBucket)
      .file(fileKey)
      .getSignedUrl(options);
    await this.redis.saveData(this.urlRedisKey, cacheKey, url, expire);
    return url;
  }

  async uploadFile(
    filePath: string,
    key: string,
    bucket?: string,
  ): Promise<void> {
    const finalBucket = this.getBucketString(bucket);
    await this.storage.bucket(finalBucket).upload(filePath, {
      destination: key,
    });
  }
}
