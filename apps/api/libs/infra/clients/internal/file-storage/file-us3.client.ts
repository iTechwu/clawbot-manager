import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { HttpService } from '@nestjs/axios';

import {
  PardxUploader,
  GetObjectOptions,
  PresignedPutUrlObject,
  PutObjectOptions,
} from './dto/file.dto';

import { PardxApp } from '@/config/dto/config.dto';
import { StorageCredentialsConfig, AppConfig } from '@/config/validation';
import { FileS3Client } from './file-s3.client';
import { RedisService } from '@app/redis';
import { createHmac } from 'crypto';
import { GetObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * UCloud US3 Storage Client
 *
 * 职责：仅负责与 UCloud US3 API 通信
 * - 不访问数据库
 * - 不包含业务逻辑
 */
export class FileUs3Client extends FileS3Client {
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
    };
    this.externalClient = new S3Client({
      ...clientConfig,
      endpoint: this.config.endpoint,
      // endpoint: this.config.domain,
    });
    // if (enviromentUtil.isProduction()) {
    //     // 创建内部客户端对象
    //     this.internalClient = new S3Client({
    //         ...clientConfig,
    //         endpoint: this.config.internalEndpoint,
    //     })
    // } else {
    this.internalClient = this.externalClient;
    // }
  }

  /**
   * 获取私有文件的下载链接
   *
   * @param fileKey 文件键名
   * @param expire 链接过期时间，单位为秒，默认为3600秒
   * @param internal 是否使用内部客户端，默认为false
   * @returns 返回一个Promise，解析后得到私有文件的下载链接
   */
  async getPrivateDownloadUrl(
    fileKey: string,
    expire: number = 30,
    internal: boolean = false,
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
    // if (this.config?.cdnKeyName && this.config?.cdnPrivateKey) {
    //     const expires = Math.floor(Date.now() / 1000) + 30
    //     const urlToSign = `${url}&Expires=${expires}&KeyName=${this.config.cdnKeyName}`
    //     const signature = createHmac(
    //         'sha1',
    //         Buffer.from(this.config.cdnPrivateKey, 'base64'),
    //     )
    //         .update(urlToSign)
    //         .digest('base64')
    // }
    return url;
  }

  async getPrivateDownloadUrlWithoutCdnEncrypt(
    fileKey: string,
    expiresIn: number = 30,
    internal: boolean = false,
    bucket?: string,
  ): Promise<string> {
    const finalBucket = bucket || this.getBucketString();
    const cacheKey = `${finalBucket}:${fileKey}`;
    // const redisUrl = await this.redis.getData(this.urlRedisKey, cacheKey)
    // if (redisUrl) {
    //     return redisUrl
    // }
    if (internal) {
      const getObjectCommand = new GetObjectCommand({
        Bucket: finalBucket,
        Key: fileKey,
      });
      const client = internal ? this.internalClient : this.externalClient;
      const signedUrl = await getSignedUrl(client, getObjectCommand, {
        expiresIn: expiresIn,
      }); // expiresIn 是预签名 URL 的有效期，单位是秒
      this.logger.info('Presigned URL:', {
        signedUrl,
        bucket: finalBucket,
      });
      await this.redis.saveData(this.urlRedisKey, cacheKey, signedUrl);
      return this.replaceUrlToOwnDoamin(signedUrl);
    } else {
      const signedUrl = this.getSignedUrl(fileKey, expiresIn, finalBucket); // expiresIn 是预签名 URL 的有效期，单位是秒
      this.logger.info('Presigned URL:', {
        signedUrl,
        bucket: finalBucket,
      });
      // await this.redis.saveData(
      //     this.urlRedisKey,
      //     cacheKey,
      //     signedUrl,
      //     expiresIn,
      // )
      return signedUrl;
    }
  }

  getSignedUrl(
    fileKey: string,
    expiresIn: number = 3600,
    bucket?: string,
  ): string {
    const httpMethod = 'GET';
    const publicKey = this.storageConfig.accessKey;
    const privateKey = this.storageConfig.secretKey;
    const finalBucket = bucket || this.config.bucket;
    const baseUrl = `${this.config.domain}/${fileKey}`;
    const expires = Math.floor(Date.now() / 1000) + expiresIn;

    const stringToSign = `${httpMethod}\n\n\n${expires}\n/${finalBucket}/${fileKey}`;
    const signature = createHmac('sha1', privateKey)
      .update(stringToSign)
      .digest('base64');
    const signedUrl = `${baseUrl}?UCloudPublicKey=${publicKey}&Signature=${encodeURIComponent(signature)}&Expires=${expires}`;

    return signedUrl;
  }
}
