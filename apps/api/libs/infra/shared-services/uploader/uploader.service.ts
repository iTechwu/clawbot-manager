import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CommonErrorCode } from '@repo/contracts/errors';
import { ApiException, apiError } from '@/filter/exception/api.exception';
import { RedisService } from '@app/redis';
import { FileStorageService } from '@app/shared-services/file-storage';
import { ConfigService } from '@nestjs/config';
import { rsaDecrypt } from '@/utils/crypto.util';

import timer from '@/utils/timer.util';
import { PardxApp, Locale, LocaleString } from '@/config/dto/config.dto';
import { AppConfig } from '@/config/validation';
import stringUtil from '@/utils/string.util';
import enviromentUtil from '@/utils/enviroment.util';
import fileUtil from '@/utils/file.util';
import { FileBucketVendor } from '@prisma/client';

/**
 * 签名数据接口
 * 从加密签名中解析出的数据结构
 */
export interface SignatureData {
  timestamp?: number;
  filename?: string;
  fileId?: string;
  platform?: string;
  userId?: string;
  sha256?: string;
}

/**
 * 上传令牌请求接口
 * 用于获取上传凭证的请求参数
 */
export interface TokenRequest {
  signature?: string;
  filename?: string;
  vendor?: FileBucketVendor;
  bucket?: string;
  locale?: string;
  key?: string;
  uploadId?: string;
  partNumber?: number;
}

@Injectable()
export class UploaderService {
  private appConfig: AppConfig;
  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly fileApi: FileStorageService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.appConfig = configService.get<AppConfig>('app');
  }
  /**
   * 校验验证信息并返回签名数据
   *
   * @param userId 用户ID
   * @param cmd 上传器公共令牌获取命令
   * @returns 返回签名数据
   * @throws 当签名验证失败时，抛出 ApiException 异常，错误信息为 'signatureError'
   * @throws 当参数无效时，抛出 ApiException 异常，错误信息为 'invalidParameters'
   */
  checkValidateAndReturnSignatureData(
    userId: string,
    cmd: TokenRequest,
  ): SignatureData {
    let signatureData: SignatureData = {};
    try {
      const jsonString = rsaDecrypt(cmd.signature);
      if (!jsonString || jsonString.trim() === '') {
        this.logger.error(
          '[Signature Validation] Decryption failed: empty result',
          {
            signature: cmd.signature?.substring(0, 50) + '...',
            userId,
          },
        );
        throw apiError(CommonErrorCode.SignatureError);
      }
      signatureData = JSON.parse(jsonString);
    } catch (e) {
      this.logger.error('[Signature Validation] Decryption or parsing failed:', {
        error: e.message || e,
        signature: cmd.signature?.substring(0, 50) + '...',
        userId,
      });
      throw apiError(CommonErrorCode.SignatureError);
    }
    const uploaderUserId = !signatureData?.userId
      ? undefined
      : signatureData.userId;
    if (userId != uploaderUserId) {
      this.logger.error('[Signature Validation] UserId mismatch:', {
        expectedUserId: userId,
        signatureUserId: uploaderUserId,
        signatureData,
      });
      throw apiError(CommonErrorCode.SignatureError);
    }
    //时间戳距离当前时间超过15秒，则无效
    const now = new Date().getTime();
    if (
      enviromentUtil.isProduction() &&
      now - signatureData.timestamp > 15 * 1000
    ) {
      this.logger.error('[Signature Validation] Timestamp expired:', {
        now,
        signatureTimestamp: signatureData.timestamp,
        diff: now - signatureData.timestamp,
      });
      throw apiError(CommonErrorCode.InvalidParameters, {
        field: 'signature',
        message: 'signatureIsExpired',
      });
    }

    return signatureData;
  }

  async getUploaderPresignedUrl(cmd: TokenRequest, ip?: string) {
    const bucket = await this.fileApi.getBucketString(
      cmd?.bucket,
      ip,
      false,
      cmd?.locale,
    );
    const vendor = cmd?.vendor ?? this.appConfig.defaultVendor;
    const token = await this.fileApi.getPresignedUrl(vendor, bucket, {
      uploadId: cmd?.uploadId,
      key: cmd?.key,
      partNumber: cmd?.partNumber,
    });

    return {
      token,
      fileKey: cmd?.key,
    };
  }

  /**
   * 使用回调方式上传文件的token
   *
   * @param key 文件唯一标识
   * @returns 返回包含token、fileKey的对象
   */
  async uploadTokenWithCallback(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
    ip?: string,
    locale?: string,
  ): Promise<{
    token: string;
    fileKey: string;
  }> {
    const callbackAuthKey = await this.redis.saveQiniuUploadAuthKey(key);
    vendor = vendor ?? (this.appConfig.defaultVendor as FileBucketVendor);
    bucket = await this.fileApi.getBucketString(bucket, ip, false, locale);
    const token = await this.fileApi.uploadTokenWithCallback(
      vendor,
      bucket,
      callbackAuthKey,
      {
        saveKey: key,
        forceSaveKey: true,
      },
    );

    return {
      token,
      fileKey: key,
    };
  }

  /**
   * 无回调地上传token
   *
   * @param userId 用户ID
   * @param filename 文件名
   * @param bucket 存储桶名称，默认为环境变量this.appConfig.defaultBucket指定的值
   * @returns 返回一个Promise，resolve后的对象包含以下字段：
   *  - token: 上传token
   *  - fileKey: 文件key
   */
  async getPublicUploadToken(
    userId: string,
    cmd: TokenRequest,
    ip?: string,
  ): Promise<{
    token: string;
    fileKey: string;
    domain: string;
    vendor: FileBucketVendor;
    bucket: string;
  }> {
    const bucket = await this.fileApi.getBucketString(
      cmd?.bucket,
      ip,
      true,
      cmd?.locale,
    );
    const vendor =
      cmd?.vendor ?? (this.appConfig.defaultVendor as FileBucketVendor);
    const fileApiConfig = await this.fileApi.getFileServiceConfig(
      vendor,
      bucket,
      ip,
    );
    const ext = fileUtil.getFileExtension(cmd.filename);
    const fileKey = await this.fileApi.formatNewKeyString(
      `public`,
      ext,
      bucket,
    );
    const token = await this.fileApi.uploadToken(vendor, bucket, {
      saveKey: fileKey,
      forceSaveKey: true,
    });
    const domain = fileApiConfig.domain;
    return {
      token,
      fileKey,
      domain,
      vendor,
      bucket,
    };
  }

  async uploadThumbToken(
    userId: string,
    cmd: TokenRequest,
    ip?: string,
  ): Promise<{
    token: string;
    key: string;
    domain: string;
    bucket: string;
  }> {
    const vendor =
      cmd?.vendor ?? (this.appConfig.defaultVendor as FileBucketVendor);
    const bucket = await this.fileApi.getBucketString(
      cmd?.bucket,
      ip,
      false,
      cmd?.locale,
      vendor,
    );

    const fileApiConfig = await this.fileApi.getFileServiceConfig(
      vendor,
      bucket,
      ip,
    );
    const ext = fileUtil.getFileExtension(cmd.filename);
    const key = await this.fileApi.formatNewKeyString(`thumbimg`, ext, bucket);
    const token = await this.fileApi.uploadToken(undefined, bucket, {
      saveKey: key,
      forceSaveKey: true,
    });
    const domain = fileApiConfig.domain;

    return {
      token,
      key,
      domain,
      bucket,
    };
  }
}
