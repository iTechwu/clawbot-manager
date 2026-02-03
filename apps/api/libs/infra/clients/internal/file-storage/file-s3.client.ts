import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import {
  PardxUploader,
  GetObjectOptions,
  PresignedPutUrlObject,
  PutObjectOptions,
} from './dto/file.dto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListBucketsCommand,
  S3Client,
  DeleteObjectsCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  ListObjectsV2Command,
  CreateMultipartUploadCommandInput,
  S3ClientConfig,
  CopyObjectCommand,
  CopyObjectCommandInput,
  waitUntilObjectExists,
} from '@aws-sdk/client-s3';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommandInput } from '@aws-sdk/client-s3/dist-types/commands/PutObjectCommand';
import { PardxApp } from '@/config/dto/config.dto';
import { StorageCredentialsConfig, AppConfig } from '@/config/validation';
import { FileStorageInterface } from './file-storage.interface';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CommonErrorCode } from '@repo/contracts/errors';
import { ApiException, apiError } from '@/filter/exception/api.exception';
import { isURL } from 'class-validator';
import { RedisService } from '@app/redis';
import enviromentUtil from '@/utils/enviroment.util';
import enviroment from '@/utils/enviroment.util';

/**
 * S3 File Storage Client
 *
 * 职责：仅负责与 S3 兼容的存储 API 通信
 * - 不访问数据库
 * - 不包含业务逻辑
 */
export class FileS3Client implements FileStorageInterface {
  protected externalClient: S3Client;
  protected internalClient: S3Client;
  config: PardxUploader.Config;
  storageConfig: StorageCredentialsConfig;
  appConfig: AppConfig;
  redis: RedisService;
  protected httpService: HttpService;
  protected logger: Logger;
  protected urlRedisKey = 'privateDownloadUrl';

  // 优化配置标志
  private readonly enableRetryMechanism =
    process.env.S3_ENABLE_RETRY === 'true' || true; // 默认启用
  private readonly enableEnhancedLogging =
    process.env.S3_ENHANCED_LOGGING === 'true' || true; // 默认启用
  private readonly maxRetries = parseInt(process.env.S3_MAX_RETRIES) || 3;
  private readonly baseRetryDelay =
    parseInt(process.env.S3_RETRY_DELAY) || 1000;
  /**
   * 构造函数，用于创建AppFile类的实例
   *
   */
  constructor(
    config: PardxUploader.Config,
    storageConfig: StorageCredentialsConfig,
    appConfig: AppConfig,
    redis: RedisService,
    httpService: HttpService,
    logger: Logger,
  ) {
    this.config = config;
    this.storageConfig = storageConfig;
    this.appConfig = appConfig;
    this.logger = logger;
    this.redis = redis;
    this.httpService = httpService;
    // console.log('this.config', this.config);
    this.setClient();

    if (this.enableRetryMechanism || this.enableEnhancedLogging) {
      if (enviroment.isProduction()) {
        this.logger.info('S3 Service optimizations enabled', {
          retryMechanism: this.enableRetryMechanism,
          enhancedLogging: this.enableEnhancedLogging,
          maxRetries: this.maxRetries,
          baseRetryDelay: this.baseRetryDelay,
        });
      }
    }
  }

  /**
   * 通用重试包装器 - 支持指数退避和智能错误分类
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: any,
    customMaxRetries?: number,
  ): Promise<T> {
    if (!this.enableRetryMechanism) {
      return operation();
    }

    const maxRetries = customMaxRetries || this.maxRetries;
    const startTime = Date.now();
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();

        if (this.enableEnhancedLogging && attempt > 1) {
          this.logger.info(`${operationName} succeeded after retries`, {
            operation: operationName,
            attempt,
            context,
            duration: Date.now() - startTime,
          });
        }

        return result;
      } catch (error) {
        lastError = error;

        // 不可重试的错误类型
        const nonRetryableErrors = [
          'NoSuchKey',
          'NoSuchBucket',
          'AccessDenied',
          'InvalidAccessKeyId',
          'SignatureDoesNotMatch',
          'BucketNotEmpty',
          'InvalidRequest',
        ];

        const errorCode = error?.Code || error?.name;

        if (nonRetryableErrors.includes(errorCode)) {
          if (this.enableEnhancedLogging) {
            this.logger.warn(
              `${operationName} failed with non-retryable error`,
              {
                operation: operationName,
                errorCode,
                context,
                attempt,
              },
            );
          }
          break;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(
            this.baseRetryDelay * Math.pow(2, attempt - 1),
            5000,
          ); // 指数退避，最大5秒

          if (this.enableEnhancedLogging) {
            this.logger.warn(
              `${operationName} attempt ${attempt} failed, retrying`,
              {
                operation: operationName,
                error: error?.message,
                errorCode,
                attempt,
                maxRetries,
                nextRetryIn: delay,
                context,
              },
            );
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          if (this.enableEnhancedLogging) {
            this.logger.error(`${operationName} failed after all retries`, {
              operation: operationName,
              error: error?.message,
              errorCode,
              attempts: maxRetries,
              context,
              duration: Date.now() - startTime,
            });
          }
        }
      }
    }

    throw lastError;
  }

  /**
   * 增强的错误处理 - 统一错误日志格式和分类
   */
  private logOperationResult(
    operationName: string,
    success: boolean,
    context?: any,
    error?: any,
    duration?: number,
  ): void {
    if (!this.enableEnhancedLogging) {
      return;
    }

    const logData = {
      operation: operationName,
      success,
      context,
      ...(duration && { duration }),
      ...(error && {
        error: error?.message,
        errorCode: error?.Code || error?.name,
        requestId: error?.$metadata?.requestId,
      }),
    };

    if (success) {
      this.logger.info(`${operationName} completed successfully`, logData);
    } else {
      this.logger.error(`${operationName} failed`, logData);
    }
  }

  setClient() {
    try {
      // 创建凭证对象
      const credentials = {
        accessKeyId: this.storageConfig.accessKey,
        secretAccessKey: this.storageConfig.secretKey,
      };

      // 优化的客户端配置
      const clientConfig: S3ClientConfig = {
        credentials: credentials,
        region: this.config.region,
        // 添加重试和超时配置
        maxAttempts: this.enableRetryMechanism ? this.maxRetries : 1,
        requestHandler: {
          requestTimeout: 30000, // 30秒超时
          connectionTimeout: 5000, // 5秒连接超时
        },
        // 优化的HTTP配置
        ...(process.env.NODE_ENV === 'production' && {
          requestHandler: {
            requestTimeout: 30000,
            connectionTimeout: 5000,
            httpsAgent: {
              keepAlive: true,
              maxSockets: 50,
            },
          },
        }),
      };

      // 创建外部客户端对象
      this.externalClient = new S3Client({
        ...clientConfig,
        endpoint: this.config.endpoint,
      });

      // 创建内部客户端（生产环境使用内部端点）
      if (enviromentUtil.isProduction() && this.config.internalEndpoint) {
        this.internalClient = new S3Client({
          ...clientConfig,
          endpoint: this.config.internalEndpoint,
        });

        this.logger.info('S3 clients initialized with internal endpoint', {
          externalEndpoint: this.config.endpoint,
          internalEndpoint: this.config.internalEndpoint,
          bucket: this.config.bucket,
          region: this.config.region,
        });
      } else {
        this.internalClient = this.externalClient;

        if (enviroment.isProduction()) {
          this.logger.info('S3 client initialized (single endpoint)', {
            endpoint: this.config.endpoint,
            bucket: this.config.bucket,
            region: this.config.region,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize S3 clients', {
        error: error.message,
        config: {
          bucket: this.config.bucket,
          region: this.config.region,
          endpoint: this.config.endpoint,
        },
      });
      throw apiError(CommonErrorCode.S3ClientInitializationError);
    }
  }

  /**
   * 获取存储桶的字符串表示
   *
   * @param bucket 存储桶名称，可选参数
   * @returns 返回存储桶的字符串表示，若未提供bucket参数，则使用默认存储桶
   */
  getBucketString(bucket?: string) {
    const defaultBucket = this.config.bucket;
    const finalBucket = bucket || defaultBucket;
    return finalBucket;
  }

  /**
   * 获取分片上传的ID
   *
   * @param key 文件在存储��中的键（Key）
   * @param filePath 文件的本地路径
   * @param bucket 存储桶的名称（可选），如果未指定，则使用默认的存储桶名称
   * @returns 返回一个 Promise 对象，解析后得到分片上传的ID
   */
  async getMultipartUploadId(key: string, bucket?: string): Promise<string> {
    const finalBucket = this.getBucketString(bucket);
    const params: PutObjectCommandInput = {
      Bucket: finalBucket,
      Key: key,
    };
    const command = new CreateMultipartUploadCommand(params);
    const multipartUpload = await this.externalClient.send(command);
    if (!multipartUpload?.UploadId) {
      throw apiError(CommonErrorCode.InitiateMultipartUploadError);
    }
    const uploadId = multipartUpload.UploadId;
    return uploadId;
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: { ETag: string; PartNumber: number }[],
    bucket?: string,
  ): Promise<void> {
    const finalBucket = this.getBucketString(bucket);
    const params = {
      Bucket: finalBucket,
      Key: key,
      MultipartUpload: { Parts: parts },
      UploadId: uploadId,
    };
    try {
      await this.externalClient.send(
        new CompleteMultipartUploadCommand(params),
      );
    } catch (e) {
      this.logger.error('completeMultipartUpload error', e);
    }
  }

  async fileDownloader(source: PardxApp.FileBase): Promise<Buffer> {
    const context = {
      key: source.key,
      bucket: source.bucket,
    };

    const startTime = Date.now();

    return this.withRetry(
      async () => {
        const finalBucket = this.getBucketString(source.bucket);
        const params = {
          Bucket: finalBucket,
          Key: source.key,
        };

        const data = await this.internalClient.send(
          new GetObjectCommand(params),
        );

        // 使用 transformToByteArray 转换流数据
        const buffer = Buffer.from(await data.Body.transformToByteArray());

        const duration = Date.now() - startTime;
        this.logOperationResult(
          'fileDownloader',
          true,
          {
            ...context,
            size: buffer.length,
          },
          null,
          duration,
        );

        return buffer;
      },
      'fileDownloader',
      context,
    );
  }

  async fileUploader(
    buffer: Buffer,
    destination: PardxApp.FileBase,
  ): Promise<void> {
    const context = {
      key: destination.key,
      bucket: destination.bucket,
      size: buffer?.length,
    };

    const startTime = Date.now();

    // 参数验证
    if (!buffer || buffer.length === 0) {
      const error = new Error('Buffer cannot be empty');
      this.logOperationResult('fileUploader', false, context, error);
      throw apiError(CommonErrorCode.InvalidParameters, {
        message: 'invalidBuffer',
      });
    }

    return this.withRetry(
      async () => {
        const finalBucket = this.getBucketString(destination.bucket);

        const params = {
          Bucket: finalBucket,
          Key: destination.key,
          Body: buffer,
        };

        await this.internalClient.send(new PutObjectCommand(params));

        const duration = Date.now() - startTime;
        this.logOperationResult('fileUploader', true, context, null, duration);
      },
      'fileUploader',
      context,
    );
  }

  async fileDataUploader(
    base64Data: string,
    key: string,
    bucket?: string,
  ): Promise<void> {
    const finalBucket = this.getBucketString(bucket);
    // 将base64数据转换为Buffer
    const buffer = Buffer.from(
      base64Data.replace(/^data:image\/\w+;base64,/, ''),
      'base64',
    );
    const params = {
      Bucket: finalBucket,
      Key: key,
      Body: buffer,
      ContentEncoding: 'base64',
      ContentType: 'image/png', // 假设上传的是JPEG图片
    };
    try {
      await this.internalClient.send(new PutObjectCommand(params));
      this.logger.info('Base64 image uploaded successfully', {
        key,
        bucket: finalBucket,
      });
    } catch (e) {
      this.logger.error('uploadBase64ImageToS3 error', e);
      throw apiError(CommonErrorCode.InternalServerError, {
        message: 'uploadBase64ImageToS3Error',
      });
    }
  }
  /**
   * 使用S3协议上传文件
   *
   * @param filePath 文件的本地路径
   * @param key 文件在存储桶中的键（Key）
   * @param bucket 存储桶的名称（可选），如果未指定，则使用默认的存储桶名称
   * @returns 返回一个 Promise 对象，解析后得到上传结果
   */
  async uploadFile(
    filePath: string,
    key: string,
    bucket?: string,
  ): Promise<void> {
    const finalBucket = this.getBucketString(bucket);
    const params = {
      Bucket: finalBucket,
      Key: key,
      Body: fs.createReadStream(filePath),
    };
    try {
      await this.internalClient.send(new PutObjectCommand(params));
      this.logger.info('File uploaded successfully', {
        key,
        bucket: finalBucket,
      });
    } catch (e) {
      this.logger.error('uploadFileToS3 error', e);
      throw apiError(CommonErrorCode.InternalServerError, {
        message: 'uploadFileToS3Error',
      });
    }
  }
  /**
   * 设置文件的Content-Disposition属性为attachment。
   * 这个方法首先会检查文件是否存在，然后根据提供的bucket参数获取最终的存储桶名称。
   * 然后，它构建一个参数对象，该对象指定了操作的存储桶和键名，
   * 以及要执行的操作——使用CopyObjectCommand命令替换元数据，
   * 其中包括将Content-Disposition设置为attachment，同时保持原有的ContentType不变。
   * 如果操作成功，它会记录一条成功的日志。
   * 如果操作失败，它会记录错误并跳过操作。
   *
   * @param fileKey 文件在存储桶中的键名
   * @param bucket 存储桶的名称（可选）
   * @param maxRetries 最大重试次数，默认为2次
   */
  async setFileContentDisposition(
    fileKey: string,
    bucket?: string,
    maxRetries: number = 2,
  ): Promise<void> {
    const finalBucket = this.getBucketString(bucket);
    const startTime = Date.now();

    // 带重试机制的执行函数
    const executeWithRetry = async (attempt: number = 1): Promise<void> => {
      try {
        // 首先检查文件是否存在并获取原始元数据
        const headCommand = new HeadObjectCommand({
          Bucket: finalBucket,
          Key: fileKey,
        });

        const headResponse = await this.internalClient.send(headCommand);

        // 如果文件不存在，HeadObjectCommand 会抛出异常
        // 如果到达这里，说明文件存在，可以继续设置 Content-Disposition

        const copySource = encodeURIComponent(
          `${finalBucket}/${fileKey}`,
        ).replace(/%2F/g, '/');

        const params = {
          Bucket: finalBucket,
          Key: fileKey,
          CopySource: copySource,
          MetadataDirective: 'REPLACE',
          // 保持原有的 ContentType，如果没有则使用默认值
          ContentType: headResponse.ContentType || 'application/octet-stream',
          ContentDisposition: 'attachment',
          // 保持原有的其他重要元数据
          ...(headResponse.CacheControl && {
            CacheControl: headResponse.CacheControl,
          }),
          ...(headResponse.ContentEncoding && {
            ContentEncoding: headResponse.ContentEncoding,
          }),
          ...(headResponse.ContentLanguage && {
            ContentLanguage: headResponse.ContentLanguage,
          }),
          ...(headResponse.Metadata && {
            Metadata: headResponse.Metadata,
          }),
        };

        await this.internalClient.send(
          new CopyObjectCommand(params as CopyObjectCommandInput),
        );

        const duration = Date.now() - startTime;
        this.logger.info('Content-Disposition set to attachment successfully', {
          fileKey,
          bucket: finalBucket,
          originalContentType: headResponse.ContentType,
          attempt,
          duration,
        });
      } catch (error) {
        // 不可重试的错误
        const nonRetryableErrors = [
          'NoSuchKey',
          'NoSuchBucket',
          'AccessDenied',
          'InvalidAccessKeyId',
        ];
        const errorCode = error?.Code || error?.name;

        if (nonRetryableErrors.includes(errorCode)) {
          if (errorCode === 'NoSuchKey') {
            this.logger.warn(
              'File not found when setting Content-Disposition, skipping operation',
              {
                fileKey,
                bucket: finalBucket,
                error: error.message,
                attempt,
              },
            );
            // 文件不存在时不抛出异常，只是记录警告并跳过
            return;
          } else {
            this.logger.error(
              'Non-retryable error setting Content-Disposition',
              {
                fileKey,
                bucket: finalBucket,
                error: error.message,
                errorCode,
                attempt,
              },
            );
            return; // 不抛异常，只记录错误
          }
        }

        // 可重试的错误
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 指数退避，最大5秒
          this.logger.warn(
            `Setting Content-Disposition failed on attempt ${attempt}, retrying in ${delay}ms`,
            {
              fileKey,
              bucket: finalBucket,
              error: error.message,
              errorCode,
              attempt,
              maxRetries,
              nextRetryIn: delay,
            },
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          return executeWithRetry(attempt + 1);
        } else {
          this.logger.error(
            'All retries exhausted for setting Content-Disposition',
            {
              fileKey,
              bucket: finalBucket,
              error: error.message,
              errorCode,
              attempts: maxRetries,
              duration: Date.now() - startTime,
            },
          );
          // 对于其他类型的错误，只记录错误，不中断主流程
        }
      }
    };

    return executeWithRetry();
  }
  /**
   * 获取内部签名URL
   *
   * @param bucket 存储桶名称
   * @param key 对象键名
   * @returns 签名URL的Promise对象
   */
  private async getInternalSignedUrl(
    bucket: string,
    key: string,
  ): Promise<string> {
    try {
      const cmd = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      return await getSignedUrl(this.internalClient, cmd, {
        expiresIn: 3600,
      });
    } catch (e) {
      throw apiError(CommonErrorCode.S3NoSuchKey);
    }
  }

  /**
   * 生成带签名的GET对象URL
   *
   * @param bucket 存储桶名称
   * @param key 对象键名
   * @param options GET对象选项，可选参数
   * @returns 返回带签名的GET对象URL的Promise对象
   */
  async signGetUrl(
    bucket: string,
    key: string,
    options?: GetObjectOptions,
  ): Promise<string> {
    try {
      const cmd = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const url = await getSignedUrl(this.externalClient, cmd, options);
      return this.replaceUrlToOwnDoamin(url);
    } catch (e) {
      throw apiError(CommonErrorCode.S3NoSuchKey);
    }
  }

  /**
   * 获取批量上传预签名URL
   *
   * @param bucket 存储桶名称
   * @param uploadId 分块上传ID
   * @param key 对象键
   * @param partNumber 分块号
   * @returns 返回预签名URL的Promise对象
   * @throws 当S3不存在指定键时，抛出ApiException异常
   */
  async getPresignedUrl(
    bucket?: string,
    uploadId?: string,
    key?: string,
    partNumber?: number,
  ): Promise<string> {
    const finalBucket = this.getBucketString(bucket);
    const params = {
      Bucket: finalBucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    };
    try {
      const command = new UploadPartCommand(params);
      const presignedUrl = await getSignedUrl(this.externalClient, command, {
        expiresIn: 3600,
      });
      return this.replaceUrlToOwnDoamin(presignedUrl);
    } catch (e) {
      throw apiError(CommonErrorCode.S3NoSuchKey);
    }
  }

  async uploadToken(bucket?: string, options?: any): Promise<string> {
    const finalBucket = this.getBucketString(bucket);
    try {
      const command = new PutObjectCommand({
        ...options,
        Bucket: finalBucket,
        Key: options.saveKey,
      });

      const url = await getSignedUrl(this.externalClient, command, {
        expiresIn: 3600, // URL有效时间，单位为秒
      });

      return this.replaceUrlToOwnDoamin(url);
    } catch (e) {
      throw apiError(CommonErrorCode.S3NoSuchKey);
    }
  }

  async uploadTokenWithCallback(
    callbackAuthKey?: string,
    scope?: string,
    options?: {
      saveKey: string;
      forceSaveKey?: boolean;
      contentType?: string;
    },
    neeSpiltPart?: boolean,
  ): Promise<string> {
    const finalBucket = this.getBucketString(scope);
    try {
      const command = new PutObjectCommand({
        ...options,
        Bucket: finalBucket,
        Key: options.saveKey,
      });

      const url = await getSignedUrl(this.externalClient, command, {
        expiresIn: 3600, // URL有效时间���单位为秒
      });
      return this.replaceUrlToOwnDoamin(url);
    } catch (e) {
      throw apiError(CommonErrorCode.S3NoSuchKey);
    }
  }

  /**
   * 列出所有的存储桶
   *
   * @returns 返回包含存储桶信息的Promise对象
   */
  async listBuckets() {
    try {
      const cmd = new ListBucketsCommand({});
      return await this.internalClient.send(cmd);
    } catch (e) {
      // throw new ApiException('s3NoSuchKey')
      this.logger.error('No bucket', e);
      return [];
    }
  }

  getConfig(): PardxUploader.Config {
    return this.config;
  }

  /**
   * 列出指定前缀的文件列表
   *
   * @param prefix 文件前缀，默认为空字符串
   * @param limit 返回的文件列表数量限制，默认为无限制
   * @param delimiter 分隔符，用于返回文件夹列表，默认为空字符串
   * @param bucket 存储桶名称，默认为当前实例的存储桶
   * @param options 其他配置选项
   * @returns 返回符合前缀的文件列表的Promise
   */
  async listFilesPrefix(
    prefix?: string,
    limit?: number,
    delimiter?: string,
    bucket?: string,
    options?: any,
  ): Promise<string[]> {
    const finalBucket = this.getBucketString(bucket);
    options = options || {};
    try {
      const command = new ListObjectsV2Command({
        ...options,
        Bucket: finalBucket,
        Prefix: prefix + '/',
        MaxKeys: limit,
        Delimiter: delimiter,
      });
      const response = await this.internalClient.send(command);
      const files = response.Contents?.map((item) => item.Key) || [];
      return files;
    } catch (e) {
      // throw new ApiException('s3NoSuchKey')
      this.logger.error('No Such Key in bucket', e);
      return [];
    }
  }
  /**
   * 删除指定文件
   *
   * @param fileKey 文件键名
   * @param bucket 存储桶名称（可选，默认为当前实例的存储桶）
   * @returns 返回一个Promise对象，解析为删除操作的结果
   */
  async deleteFile(fileKey: string, bucket?: string): Promise<boolean> {
    const context = {
      fileKey,
      bucket,
    };

    const startTime = Date.now();

    // 验证 fileKey 不是 URL
    if (isURL(fileKey)) {
      this.logOperationResult(
        'deleteFile',
        false,
        context,
        new Error('Cannot delete URL, expecting file key'),
      );
      return false;
    }

    try {
      return await this.withRetry(
        async () => {
          const finalBucket = this.getBucketString(bucket);

          const deleteCommand = new DeleteObjectCommand({
            Bucket: finalBucket,
            Key: fileKey,
          });

          const data = await this.internalClient.send(deleteCommand);

          const duration = Date.now() - startTime;
          this.logOperationResult(
            'deleteFile',
            true,
            {
              ...context,
              bucket: finalBucket,
            },
            null,
            duration,
          );

          return true;
        },
        'deleteFile',
        context,
      );
    } catch (e) {
      const duration = Date.now() - startTime;
      this.logOperationResult('deleteFile', false, context, e, duration);

      // 对于删除操作，如果文件不存在也算成功
      if (e?.Code === 'NoSuchKey' || e?.name === 'NoSuchKey') {
        this.logger.info('File already deleted or does not exist', context);
        return true;
      }

      return false;
    }
  }

  async batchDeleteFiles(fileKeys: string[], bucket?: string): Promise<any> {
    const finalBucket = this.getBucketString(bucket);
    const deleteParams = {
      Bucket: finalBucket,
      Delete: {
        Objects: fileKeys.map((key) => ({ Key: key })),
      },
    };
    try {
      const command = new DeleteObjectsCommand(deleteParams);
      const response = await this.internalClient.send(command);
      return response;
    } catch (e) {
      this.logger.error('No Such Key in bucket', e);
      return null;
    }
  }
  async getFileInfo(fileKey: string, bucket?: string): Promise<any> {
    const finalBucket = this.getBucketString(bucket);
    const params = {
      Bucket: finalBucket,
      Key: fileKey,
    };
    try {
      const command = new GetObjectCommand(params);
      const { Metadata } = await this.internalClient.send(command);

      // 注意：Metadata 只包含用户设置的元数据，不包括文件大小、MIME 类型等基本信息
      // 如果你需要这些信息，你可以使用 HeadObjectCommand

      // 示例：使用 HeadObjectCommand 获取文件的更多信息
      const headCommand = new HeadObjectCommand(params);
      const headResponse = await this.internalClient.send(headCommand);

      // headResponse 包含了文件的元数据和基本信息，如 ContentLength、ContentType 等
      return {
        ...headResponse,
        // 可以根据需要添加或删除属性
        Metadata: Metadata || {}, // 如果 GetObjectCommand 的 Metadata 为空，则提供一个空对象
      };
    } catch (e) {
      this.logger.error('No Such Key in bucket', e, fileKey);
      return null;
    }
  }

  /**
   * 获取私有文件的下载链接
   *
   * @param fileKey 文件键名
   * @param expire 链接过期时间，单位为秒，默认为30秒
   * @param internal 是否使用内部客户端，默认为false
   * @param bucket 存储桶名称（可选），如果未提供则使用配置中的默认存储桶
   * @returns 返回一个Promise，解析后得到私有文件的下载链接
   */
  async getPrivateDownloadUrl(
    fileKey: string,
    expire: number = 30,
    internal: boolean = false,
    bucket?: string,
  ): Promise<string> {
    const finalBucket = bucket || this.getBucketString();
    const cacheKey = `${finalBucket}:${fileKey}`;
    const redisUrl = await this.redis.getData(this.urlRedisKey, cacheKey);
    if (redisUrl) {
      return redisUrl;
    }
    const getObjectCommand = new GetObjectCommand({
      Bucket: finalBucket,
      Key: fileKey,
    });
    const client = internal ? this.internalClient : this.externalClient;
    const signedUrl = await getSignedUrl(client, getObjectCommand, {
      expiresIn: expire,
    }); // expiresIn 是预签名 URL 的有效期，单位是秒
    this.logger.info('Presigned URL:', { signedUrl, bucket: finalBucket });
    await this.redis.saveData(this.urlRedisKey, cacheKey, signedUrl);
    return this.replaceUrlToOwnDoamin(signedUrl);
  }

  async fetchToBucket(
    resUrl: string,
    fileKey: string,
    bucket?: string,
  ): Promise<any> {
    const finalBucket = this.getBucketString(bucket);
    // 从 URL 获取资源
    const response = await firstValueFrom(
      this.httpService.request({
        method: 'get',
        url: resUrl,
        responseType: 'arraybuffer', // 改为 arraybuffer 避免流式传输问题
      }),
    );

    // 获取 Content-Length
    const contentLength = response.headers['content-length'];
    const contentType = response.headers['content-type'];

    // 创建 PutObjectCommand
    const uploadParams: any = {
      Bucket: finalBucket,
      Key: fileKey,
      Body: response.data,
    };

    // 设置 ContentType
    if (contentType) {
      uploadParams.ContentType = contentType;
    } else {
      // 根据文件扩展名设置默认的ContentType
      const fileExt = fileKey.split('.').pop()?.toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        bmp: 'image/bmp',
        svg: 'image/svg+xml',
      };
      if (fileExt && mimeTypes[fileExt]) {
        uploadParams.ContentType = mimeTypes[fileExt];
      } else {
        uploadParams.ContentType = 'image/png'; // 默认设置为PNG
      }
    }

    // 设置 ContentLength（如果可用）
    if (contentLength) {
      uploadParams.ContentLength = parseInt(contentLength, 10);
    }

    const command = new PutObjectCommand(uploadParams);
    // 上传资源到 S3
    const data = await this.internalClient.send(command);
    this.logger.info('fetchToBucket S3 success', { data });
    return data;
  }

  // OSS 文件复制
  async copyFile(
    sourceBucket: string,
    sourceObject: string,
    targetBucket: string,
    targetObject: string,
  ) {
    const copyParams = {
      CopySource: `${sourceBucket}/${sourceObject}`,
      Bucket: targetBucket,
      Key: targetObject,
    };
    const command = new CopyObjectCommand(copyParams);
    const data = await this.internalClient.send(command);
    await waitUntilObjectExists(
      { client: this.internalClient, maxWaitTime: 30000 },
      { Bucket: targetBucket, Key: targetObject },
    );
    return data;
  }

  replaceUrlToOwnDoamin(url: string): string {
    // if (this.config.domain && isURL(this.config.domain)) {
    //     const fileDomain = this.config.endpoint.replace('s3-', this.config.bucket + '.s3-')
    //     const newUrl = url.replace(fileDomain, this.config.domain)
    //     this.logger.info('replaceUrlToOwnDoamin old:', { url })
    //     this.logger.info('replaceUrlToOwnDoamin old:', { newUrl })
    //     return newUrl
    // }
    return url;
  }
}
