import { Controller, Req, VERSION_NEUTRAL } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { uploaderContract as c } from '@repo/contracts/api';
import { success } from '@/common/ts-rest/response.helper';
import { UploaderService } from '@app/shared-services/uploader';
import { FileSourceService } from '@app/db';
import { FileStorageService } from '@app/shared-services/file-storage';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/config/validation';
import fileUtil from '@/utils/file.util';
import ipUtil from '@/utils/ip.util';
import { FileBucketVendor } from '@prisma/client';
import { AuthenticatedRequest, Auth } from '@app/auth';

/**
 * 文件上传控制器
 *
 * 提供文件上传相关的 API 端点，包括：
 * - 获取上传凭证（私有/公开/缩略图）
 * - 分片上传初始化和凭证获取
 * - 上传完成确认
 * - 上传取消
 *
 * @version VERSION_NEUTRAL
 *
 * 版本控制说明：
 * - VERSION_NEUTRAL 表示该控制器为"版本中立"
 * - 接受任何版本的请求，或者没有版本头的请求
 * - 客户端调用时无需提供 `x-api-version` 请求头
 * - 适用于上传接口这类稳定、不需要版本迭代的基础设施接口
 *
 * 如需版本控制，可改为：
 * @example
 * ```typescript
 * // 指定版本（需要 x-api-version: 1 请求头）
 * @Controller({ version: '1' })
 *
 * // 支持多版本
 * @Controller({ version: ['1', '2'] })
 * ```
 */
@Controller({
  /**
   * VERSION_NEUTRAL: 版本中立模式
   *
   * 在 Header 版本控制模式下（x-api-version）：
   * - 接受任何版本号的请求
   * - 接受没有版本头的请求
   * - 不会因版本不匹配而拒绝请求
   *
   * 适用场景：
   * - 基础设施接口（上传、健康检查等）
   * - 不需要版本迭代的稳定接口
   * - 需要向后兼容的公共接口
   */
  version: VERSION_NEUTRAL,
})
@Auth()
export class UploaderController {
  private appConfig: AppConfig;

  constructor(
    private readonly uploaderService: UploaderService,
    private readonly fileSourceDb: FileSourceService,
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ConfigService,
  ) {
    this.appConfig = configService.get<AppConfig>('app');
  }

  @TsRestHandler(c.getPrivateThumbToken)
  async getPrivateThumbToken(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.getPrivateThumbToken, async ({ body }) => {
      const userId = req.userId;
      const ip = ipUtil.extractIp(req);

      // 签名验证 - body 类型由 ts-rest contract 的 Zod schema 推断
      this.uploaderService.checkValidateAndReturnSignatureData(userId, body);

      const result = await this.uploaderService.uploadThumbToken(
        userId,
        body,
        ip,
      );

      return success({
        token: result.token,
        key: result.key,
        fileId: result.key,
        bucket: result.bucket,
        url: `${result.domain}/${result.key}`,
      });
    });
  }

  @TsRestHandler(c.initMultipart)
  async initMultipart(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.initMultipart, async ({ body }) => {
      const userId = req.userId;
      const ip = ipUtil.extractIp(req);

      // 签名验证
      const signatureData =
        this.uploaderService.checkValidateAndReturnSignatureData(userId, body);

      const vendor =
        body.vendor ?? (this.appConfig.defaultVendor as FileBucketVendor);
      const bucket = await this.fileStorageService.getBucketString(
        body.bucket,
        ip,
        false,
        body.locale,
        vendor,
      );

      const ext = fileUtil.getFileExtension(body.filename);
      const key = await this.fileStorageService.formatNewKeyString(
        'private',
        ext,
        bucket,
      );

      // Create file source record
      const fileSource = await this.fileSourceDb.create({
        key,
        bucket,
        vendor,
        fsize: body.fsize,
        mimeType: fileUtil.getMimeType(body.filename),
        ext,
        sha256: body.sha256 || signatureData.sha256,
        isUploaded: false,
      });

      // Get multipart upload ID
      const uploadId = await this.fileStorageService.getMultipartUploadId(
        vendor,
        bucket,
        key,
        ip,
      );

      // Get presigned URL for first part
      const token = await this.fileStorageService.getPresignedUrl(
        vendor,
        bucket,
        { uploadId, key, partNumber: 1 },
      );

      return success({
        token,
        key,
        fileId: fileSource.id,
        bucket,
        url: uploadId,
      });
    });
  }

  @TsRestHandler(c.getMultipartToken)
  async getMultipartToken(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.getMultipartToken, async ({ body }) => {
      const userId = req.userId;
      const ip = ipUtil.extractIp(req);

      // 签名验证
      this.uploaderService.checkValidateAndReturnSignatureData(userId, body);

      const result = await this.uploaderService.getUploaderPresignedUrl(
        body,
        ip,
      );

      const defaultBucket = await this.fileStorageService.getDefaultBucket();

      return success({
        token: result.token,
        key: result.fileKey,
        fileId: body.key || result.fileKey,
        bucket: body.bucket || defaultBucket,
      });
    });
  }

  @TsRestHandler(c.getPrivateToken)
  async getPrivateToken(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.getPrivateToken, async ({ body }) => {
      const userId = req.userId;
      const ip = ipUtil.extractIp(req);

      // 签名验证
      const signatureData =
        this.uploaderService.checkValidateAndReturnSignatureData(userId, body);

      const vendor =
        body.vendor ?? (this.appConfig.defaultVendor as FileBucketVendor);
      const bucket = await this.fileStorageService.getBucketString(
        body.bucket,
        ip,
        false,
        body.locale,
        vendor,
      );

      const ext = fileUtil.getFileExtension(body.filename);
      const key = await this.fileStorageService.formatNewKeyString(
        'private',
        ext,
        bucket,
      );

      // Create file source record
      const fileSource = await this.fileSourceDb.create({
        key,
        bucket,
        vendor,
        fsize: body.fsize,
        mimeType: fileUtil.getMimeType(body.filename),
        ext,
        sha256: body.sha256 || signatureData.sha256,
        isUploaded: false,
      });

      // Get upload token with callback
      const result = await this.uploaderService.uploadTokenWithCallback(
        vendor,
        bucket,
        key,
        ip,
        body.locale,
      );

      const url = await this.fileStorageService.getPrivateDownloadUrl(
        vendor,
        bucket,
        result.fileKey,
      );

      return success({
        token: result.token,
        key: result.fileKey,
        fileId: fileSource.id,
        bucket,
        url,
      });
    });
  }

  @TsRestHandler(c.abort)
  async abort(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.abort, async ({ body }) => {
      const userId = req.userId;

      this.uploaderService.checkValidateAndReturnSignatureData(userId, {
        signature: body.signature,
      });

      // Mark file as deleted
      await this.fileSourceDb.update({ id: body.fileId }, { isDeleted: true });

      return success({ success: true });
    });
  }

  @TsRestHandler(c.complete)
  async complete(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.complete, async ({ body }) => {
      const userId = req.userId;

      this.uploaderService.checkValidateAndReturnSignatureData(userId, {
        signature: body.signature,
      });

      // Get file source and mark as uploaded
      const fileSource = await this.fileSourceDb.update(
        { id: body.fileId },
        { isUploaded: true },
      );

      const url = await this.fileStorageService.getPrivateDownloadUrl(
        fileSource.vendor,
        fileSource.bucket,
        fileSource.key,
      );

      return success({
        id: fileSource.id,
        key: fileSource.key,
        bucket: fileSource.bucket,
        fsize: fileSource.fsize,
        mimeType: fileSource.mimeType,
        ext: fileSource.ext,
        sha256: fileSource.sha256,
        isUploaded: fileSource.isUploaded,
        url,
      });
    });
  }
}
