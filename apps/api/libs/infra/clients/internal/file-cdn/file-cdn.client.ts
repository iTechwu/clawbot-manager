/**
 * @fileoverview File CDN 客户端
 *
 * 本文件实现了 CDN URL 生成服务，负责：
 * - 生成图片 CDN URL（火山引擎、CloudFlare）
 * - 生成视频点播 URL
 * - 生成文件下载 URL
 * - 处理 CDN 签名和认证
 *
 * @module file-cdn/client
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import { FileBucketVendor } from '@prisma/client';

import { RedisService } from '@app/redis';
import { FileStorageService } from '@app/shared-services/file-storage';
import { CryptClient } from '@app/clients/internal/crypt';
import * as cryptoUtil from '@/utils/crypto.util';
import {
  PardxFileCdn,
  CdnUrlResponse,
  ImageTemplateId,
  CloudFlareTemplate,
  SignedUrlParams,
} from './dto/file-cdn.dto';

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 默认过期时间（30天，单位：秒）
 */
const DEFAULT_EXPIRE_IN = 24 * 3600 * 30;

/**
 * AWS 签名 V4 算法
 */
const AWS_ALGORITHM = 'AWS4-HMAC-SHA256';

/**
 * 未签名内容 SHA256
 */
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

/**
 * 默认签名头
 */
const DEFAULT_SIGNED_HEADERS = 'host';

/**
 * 默认签名 ID
 */
const DEFAULT_SIGNED_ID = 'GetObject';

/**
 * 火山引擎图片模板映射
 */
const VOLCENGINE_TEMPLATES: Record<string, string> = {
  origin: '~tplv-fv5ms769k2-preview-v3.image',
  preview: '~tplv-fv5ms769k2-preview-v3.image',
  mini: '~tplv-i29hxueo9g-mini.image',
};

/**
 * CloudFlare 图片尺寸模板映射
 */
const CLOUDFLARE_TEMPLATES: Record<string, string> = {
  '360:360:360:360': 'width=360,height=360,fit=crop,gravity=center',
  '183:103:360:360': 'width=320,height=180,fit=crop,gravity=center',
  origin: 'fit=contain',
  mini: 'width=360,height=360,fit=contain',
  default: 'width=720,height=720,fit=contain',
};

// ============================================================================
// 客户端实现
// ============================================================================

/**
 * File CDN 客户端
 *
 * @description 提供 CDN URL 生成服务，支持多种 CDN 供应商和 URL 类型。
 *
 * 主要功能：
 * - **图片 CDN**: 火山引擎图片处理、CloudFlare 图片优化
 * - **视频 CDN**: 视频点播 URL 生成
 * - **下载 CDN**: 文件下载 URL 生成
 *
 * 安全特性：
 * - 支持 AWS 签名 V4 认证
 * - 支持 URL 签名验证
 * - 私有文件访问控制
 *
 * @class FileCdnClient
 *
 * @example
 * ```typescript
 * @Injectable()
 * class ImageService {
 *   constructor(private readonly cdnClient: FileCdnClient) {}
 *
 *   // 获取图片 CDN URL
 *   async getImageUrl(vendor: FileBucketVendor, bucket: string, key: string) {
 *     return await this.cdnClient.getImageVolcengineCdn(
 *       vendor,
 *       bucket,
 *       key,
 *       'mini',
 *     );
 *   }
 *
 *   // 获取视频 URL
 *   async getVideoUrl(vendor: FileBucketVendor, bucket: string, key: string) {
 *     return await this.cdnClient.getVodUrl(vendor, bucket, key);
 *   }
 * }
 * ```
 */
@Injectable()
export class FileCdnClient {
  /**
   * CDN 配置
   * @private
   */
  private readonly cdnConfig: PardxFileCdn.Configs;

  /**
   * 默认存储供应商
   * @private
   */
  private readonly defaultVendor: FileBucketVendor;

  /**
   * 构造函数
   *
   * @param {ConfigService} config - NestJS 配置服务
   * @param {RedisService} redis - Redis 服务
   * @param {FileStorageService} fileApi - 文件存储服务
   * @param {CryptClient} crypt - 加密服务
   * @param {Logger} logger - Winston 日志记录器
   */
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly fileApi: FileStorageService,
    private readonly crypt: CryptClient,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.cdnConfig = config.getOrThrow<PardxFileCdn.Configs>('cdn');
    this.defaultVendor =
      config.getOrThrow<FileBucketVendor>('app.defaultVendor');
  }

  // =========================================================================
  // 公共方法
  // =========================================================================

  /**
   * 获取文件下载 URL
   *
   * @description 生成文件下载器的 CDN URL，支持公开和私有文件。
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @param {string} key - 文件键
   * @returns {Promise<string>} CDN 下载 URL
   *
   * @example
   * ```typescript
   * const url = await cdnClient.getDownloaderUrl('oss', 'my-bucket', 'files/doc.pdf');
   * // 返回: "https://cdn.example.com/signed-url..."
   * ```
   */
  async getDownloaderUrl(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
  ): Promise<string> {
    const bucketConfig = await this.fileApi.getFileServiceConfig(
      vendor,
      bucket,
    );
    const domain = this.cdnConfig.cn.downloaderUrl;
    const uri = key;

    if (bucketConfig.isPublic) {
      return this.buildPublicUrl(domain, uri);
    }

    return this.buildPrivateUrl(domain, uri, key);
  }

  /**
   * 获取视频点播 URL
   *
   * @description 生成视频点播的 CDN URL，支持公开和私有视频。
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @param {string} key - 视频文件键
   * @returns {Promise<string>} CDN 视频 URL
   *
   * @example
   * ```typescript
   * const url = await cdnClient.getVodUrl('tos', 'video-bucket', 'videos/movie.mp4');
   * // 返回: "https://vod.example.com/signed-url..."
   * ```
   */
  async getVodUrl(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
  ): Promise<string> {
    const bucketConfig = await this.fileApi.getFileServiceConfig(
      vendor,
      bucket,
    );
    const domain = this.cdnConfig.cn.vodUrl;
    const uri = key;

    if (bucketConfig.isPublic) {
      return this.buildPublicUrl(domain, uri);
    }

    return this.buildPrivateUrl(domain, uri, key);
  }

  /**
   * 获取火山引擎图片 CDN URL
   *
   * @description 生成火山引擎图片处理的 CDN URL，支持多种图片模板。
   *
   * 支持的模板：
   * - `origin`: 原图预览
   * - `preview`: 预览图
   * - `mini`: 缩略图
   * - 自定义尺寸: `183:103:360:360` 格式
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @param {string} key - 图片文件键
   * @param {ImageTemplateId} [templateId='183:103:360:360'] - 图片模板 ID
   * @returns {Promise<string>} CDN 图片 URL
   *
   * @example
   * ```typescript
   * // 获取缩略图
   * const miniUrl = await cdnClient.getImageVolcengineCdn(
   *   'tos',
   *   'image-bucket',
   *   'images/photo.jpg',
   *   'mini',
   * );
   *
   * // 获取自定义尺寸
   * const customUrl = await cdnClient.getImageVolcengineCdn(
   *   'tos',
   *   'image-bucket',
   *   'images/photo.jpg',
   *   '640:480:640:480',
   * );
   * ```
   */
  async getImageVolcengineCdn(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
    templateId: ImageTemplateId = '183:103:360:360',
  ): Promise<string> {
    const thumbTemplate = this.getVolcengineTemplate(templateId);
    const domain = this.cdnConfig.cn.url;
    const bucketConfig = await this.fileApi.getFileServiceConfig(
      vendor,
      bucket,
    );

    const uri = `${vendor}/${bucket}/${key}${thumbTemplate}?`;

    if (bucketConfig.isPublic) {
      return this.buildPublicUrl(domain, uri);
    }

    return this.buildPrivateImageUrl(
      domain,
      uri,
      key + thumbTemplate,
      templateId,
    );
  }

  /**
   * 获取 CloudFlare 图片 CDN URL
   *
   * @description 生成 CloudFlare 图片优化的 CDN URL。
   *
   * 支持的模板：
   * - `360:360:360:360`: 360x360 裁剪
   * - `183:103:360:360`: 320x180 裁剪
   * - `origin`: 原图
   * - `mini`: 360x360 包含
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @param {string} key - 图片文件键
   * @param {CloudFlareTemplate} [templateId='183:103:360:360'] - CloudFlare 模板
   * @returns {Promise<string>} CDN 图片 URL
   *
   * @example
   * ```typescript
   * const url = await cdnClient.getImageCloudFlareCdnUrl(
   *   'oss',
   *   'image-bucket',
   *   'images/photo.jpg',
   *   'mini',
   * );
   * ```
   */
  async getImageCloudFlareCdnUrl(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
    templateId: CloudFlareTemplate = '183:103:360:360',
  ): Promise<string> {
    const cfTemplate = this.getCloudFlareTemplate(templateId);
    const bucketConfig = await this.fileApi.getFileServiceConfig(
      vendor,
      bucket,
    );
    const domain = `${this.cdnConfig.us.url}/${cfTemplate}/https://api.dndshare.com/filecdn/`;
    const uri = `${vendor}/${bucket}/${key}?`;

    if (bucketConfig.isPublic) {
      return this.crypt.getSignUrl(uri);
    }

    return this.buildCloudFlarePrivateUrl(domain, uri, key, templateId);
  }

  /**
   * 获取原始 CDN 图片（带验证）
   *
   * @description 验证签名后返回原始图片 URL，用于 CDN 回源。
   *
   * @param {FileBucketVendor} vendor - 存储供应商
   * @param {string} bucket - 存储桶名称
   * @param {string} key - 图片文件键
   * @param {string} [auth] - 认证信息
   * @param {string} [expireIn] - 过期时间
   * @param {string} [signature] - 签名
   * @param {string} [signedHeaders] - 签名头
   * @param {string} [signedId] - 签名 ID
   * @param {string} [templateId='183:103:360:360'] - 模板 ID
   * @returns {Promise<CdnUrlResponse>} CDN URL 响应
   *
   * @example
   * ```typescript
   * const response = await cdnClient.getCdnOriginImages(
   *   'tos',
   *   'bucket',
   *   'key',
   *   auth,
   *   expireIn,
   *   signature,
   *   signedHeaders,
   *   signedId,
   * );
   *
   * if (response.code === 200) {
   *   console.log('Origin URL:', response.url);
   * }
   * ```
   */
  async getCdnOriginImages(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
    auth?: string,
    expireIn?: string,
    signature?: string,
    signedHeaders?: string,
    signedId?: string,
    templateId: string = '183:103:360:360',
  ): Promise<CdnUrlResponse> {
    // 验证存储桶
    if (!this.fileApi.checkBucketValidate(vendor, bucket)) {
      return this.createForbiddenResponse();
    }

    // 获取存储桶配置
    const bucketConfig = await this.fileApi.getFileServiceConfig(
      vendor,
      bucket,
    );

    // 验证私有文件的签名
    if (
      !bucketConfig.isPublic &&
      !this.validateSignature(
        {
          auth,
          expireIn,
          signature,
          signedHeaders,
          signedId,
          templateId,
        },
        key,
      )
    ) {
      return this.createForbiddenResponse();
    }

    this.logger.info('Fetching CDN origin image', {
      vendor,
      bucket,
      key,
    });

    // 获取私有下载 URL
    const url = await this.fileApi.getPrivateDownloadUrl(vendor, bucket, key, {
      expire: DEFAULT_EXPIRE_IN,
      internal: false,
    });

    return this.createSuccessResponse(url);
  }

  // =========================================================================
  // 私有辅助方法
  // =========================================================================

  /**
   * 构建公开 URL
   *
   * @private
   */
  private buildPublicUrl(domain: string, uri: string): string {
    return `${domain}/${this.crypt.getSignUrl(encodeURI(uri))}`;
  }

  /**
   * 构建私有 URL（带 AWS 签名 V4）
   *
   * @private
   */
  private buildPrivateUrl(domain: string, uri: string, key: string): string {
    const auth = this.crypt.encrypt(key);
    const signature = this.generateSignature(auth);

    return this.buildAwsSignedUrl(domain, uri, {
      auth,
      signature,
      expireIn: DEFAULT_EXPIRE_IN,
    });
  }

  /**
   * 构建私有图片 URL
   *
   * @private
   */
  private buildPrivateImageUrl(
    domain: string,
    uri: string,
    keyWithTemplate: string,
    templateId: string,
  ): string {
    const auth = this.crypt.encrypt(keyWithTemplate);
    const signature = this.generateSignature(auth);

    return `${this.buildAwsSignedUrl(domain, uri, {
      auth,
      signature,
      expireIn: DEFAULT_EXPIRE_IN,
    })}&templateId=${templateId}`;
  }

  /**
   * 构建 CloudFlare 私有 URL
   *
   * @private
   */
  private buildCloudFlarePrivateUrl(
    domain: string,
    uri: string,
    key: string,
    templateId: string,
  ): string {
    const auth = this.crypt.encrypt(key);
    const signature = this.generateSignature(auth);

    return `${domain}/${this.crypt.getSignUrl(uri)}&X-Amz-Algorithm=${AWS_ALGORITHM}&X-Amz-Content-Sha256=${UNSIGNED_PAYLOAD}&X-Amz-Credential=${auth}&X-Amz-Expires=${DEFAULT_EXPIRE_IN}&X-Amz-Signature=${signature}&X-Amz-SignedHeaders=${DEFAULT_SIGNED_HEADERS}&x-id=${DEFAULT_SIGNED_ID}&templateId=${templateId}`;
  }

  /**
   * 构建 AWS 签名 URL
   *
   * @private
   */
  private buildAwsSignedUrl(
    domain: string,
    uri: string,
    params: { auth: string; signature: string; expireIn: number },
  ): string {
    const { auth, signature, expireIn } = params;
    const signedUri = this.crypt.getSignUrl(encodeURI(uri));

    return `${domain}/${signedUri}&X-Amz-Algorithm=${AWS_ALGORITHM}&X-Amz-Content-Sha256=${UNSIGNED_PAYLOAD}&X-Amz-Credential=${auth}&X-Amz-Expires=${expireIn}&X-Amz-Signature=${signature}&X-Amz-SignedHeaders=${DEFAULT_SIGNED_HEADERS}&x-id=${DEFAULT_SIGNED_ID}`;
  }

  /**
   * 生成签名
   *
   * @private
   */
  private generateSignature(auth: string): string {
    return cryptoUtil.sha1(
      `${auth}-time-${DEFAULT_EXPIRE_IN}-header-${DEFAULT_SIGNED_HEADERS}-id-${DEFAULT_SIGNED_ID}`,
    );
  }

  /**
   * 获取火山引擎图片模板
   *
   * @private
   */
  private getVolcengineTemplate(templateId: ImageTemplateId): string {
    if (VOLCENGINE_TEMPLATES[templateId]) {
      return VOLCENGINE_TEMPLATES[templateId];
    }
    return `~tplv-fv5ms769k2-preview-v2:${templateId}.webp`;
  }

  /**
   * 获取 CloudFlare 图片模板
   *
   * @private
   */
  private getCloudFlareTemplate(templateId: CloudFlareTemplate): string {
    return CLOUDFLARE_TEMPLATES[templateId] || CLOUDFLARE_TEMPLATES.default;
  }

  /**
   * 验证签名
   *
   * @private
   */
  private validateSignature(params: SignedUrlParams, key: string): boolean {
    const { auth, expireIn, signature, signedHeaders, signedId, templateId } =
      params;

    if (!auth || !expireIn || !signature) {
      return false;
    }

    // 验证签名
    const expectedSignature = cryptoUtil.sha1(
      `${auth}-time-${expireIn}-header-${signedHeaders}-id-${signedId}`,
    );

    if (expectedSignature !== signature) {
      return false;
    }

    // 验证认证信息
    const decodedAuth = decodeURIComponent(auth);
    const authKey = decodeURIComponent(this.crypt.decrypt(decodedAuth));

    const template =
      templateId !== 'origin'
        ? `~tplv-i29hxueo9g-thumb-v1:${templateId}.awebp`
        : '~tplv-i29hxueo9g-orgin.awebp';

    return authKey === `${key}${template}`;
  }

  /**
   * 创建禁止访问响应
   *
   * @private
   */
  private createForbiddenResponse(): CdnUrlResponse {
    return {
      code: 403,
      message: 'Forbidden',
      url: '',
    };
  }

  /**
   * 创建成功响应
   *
   * @private
   */
  private createSuccessResponse(url: string): CdnUrlResponse {
    return {
      code: 200,
      message: 'success',
      url,
    };
  }
}
