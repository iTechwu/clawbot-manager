/**
 * @fileoverview 文件存储服务类型定义
 *
 * 本文件定义了文件存储服务层的核心类型和接口。
 *
 * @module file-storage/types
 */

import { FileBucketVendor } from '@prisma/client';
import { PardxUploader } from '@app/clients/internal/file-storage';

/**
 * 文件位置标识
 *
 * @description 唯一标识一个存储桶中的文件
 * @interface FileLocation
 */
export interface FileLocation {
  /** 存储供应商 */
  vendor: FileBucketVendor;
  /** 存储桶名称 */
  bucket: string;
  /** 文件键（路径） */
  key: string;
}

/**
 * 存储桶标识
 *
 * @description 唯一标识一个存储桶
 * @interface BucketIdentifier
 */
export interface BucketIdentifier {
  /** 存储供应商 */
  vendor: FileBucketVendor;
  /** 存储桶名称 */
  bucket: string;
}

/**
 * 存储桶查询选项
 *
 * @description 用于查找存储桶的选项参数
 * @interface BucketLookupOptions
 */
export interface BucketLookupOptions {
  /** 存储桶名称（可选） */
  bucket?: string;
  /** 客户端 IP（用于区域感知） */
  ip?: string;
  /** 是否公开存储桶 */
  isPublic?: boolean;
  /** 区域设置 */
  locale?: string;
  /** 存储供应商 */
  vendor?: FileBucketVendor;
}

/**
 * 文件上传选项
 *
 * @interface UploadOptions
 */
export interface UploadOptions {
  /** 内容类型 */
  contentType?: string;
  /** 访问控制 */
  acl?: 'public-read' | 'public-read-write' | 'private';
  /** 自定义元数据 */
  metadata?: Record<string, string>;
}

/**
 * 分片上传部分信息
 *
 * @interface MultipartPart
 */
export interface MultipartPart {
  /** ETag 标识 */
  ETag: string;
  /** 分片序号 */
  PartNumber: number;
}

/**
 * 预签名 URL 选项
 *
 * @interface PresignedUrlOptions
 */
export interface PresignedUrlOptions {
  /** 上传 ID（用于分片上传） */
  uploadId?: string;
  /** 文件键 */
  key?: string;
  /** 分片序号 */
  partNumber?: number;
}

/**
 * 文件列表查询选项
 *
 * @interface ListFilesOptions
 */
export interface ListFilesOptions {
  /** 前缀过滤 */
  prefix?: string;
  /** 返回数量限制 */
  limit?: number;
  /** 分隔符 */
  delimiter?: string;
  /** 附加选项 */
  extras?: Record<string, any>;
}

/**
 * 视频截图选项
 *
 * @interface SnapshotOptions
 */
export interface SnapshotOptions {
  /** 截图时间点（秒） */
  time?: number;
  /** 截图宽度 */
  width?: number;
  /** 截图高度 */
  height?: number;
  /** 输出格式 */
  format?: string;
  /** 是否使用内部端点 */
  internal?: boolean;
}

/**
 * 私有下载 URL 选项
 *
 * @interface PrivateDownloadOptions
 */
export interface PrivateDownloadOptions {
  /** 过期时间（秒） */
  expire?: number;
  /** 是否使用内部端点 */
  internal?: boolean;
}

/**
 * 存储客户端缓存键
 *
 * @description 用于唯一标识一个存储客户端实例
 */
export type StorageClientKey = `${FileBucketVendor}:${string}`;

/**
 * 构建存储客户端缓存键
 *
 * @param vendor - 存储供应商
 * @param bucket - 存储桶名称
 * @returns 缓存键
 */
export function buildStorageClientKey(
  vendor: FileBucketVendor,
  bucket: string,
): StorageClientKey {
  return `${vendor}:${bucket}`;
}

/**
 * 文件复制参数
 *
 * @interface CopyFileParams
 */
export interface CopyFileParams {
  /** 源文件位置 */
  source: FileLocation;
  /** 目标文件位置 */
  destination: FileLocation;
}

/**
 * 回调上传令牌选项
 *
 * @interface CallbackUploadTokenOptions
 */
export interface CallbackUploadTokenOptions {
  /** 回调验证密钥 */
  callbackAuthKey: string;
  /** 是否需要分片上传 */
  needSplitPart?: boolean;
  /** 附加选项 */
  extras?: Record<string, any>;
}

/**
 * 存储供应商类型到客户端类的映射
 */
export type VendorClientMapping = Record<
  FileBucketVendor,
  new (...args: any[]) => any
>;

/**
 * 存储凭证配置映射
 */
export interface StorageCredentialsMap {
  gcs?: PardxUploader.FileApiKey;
  us3?: PardxUploader.FileApiKey;
  oss?: PardxUploader.FileApiKey;
  tos?: PardxUploader.FileApiKey;
  qiniu?: PardxUploader.FileApiKey;
  s3?: PardxUploader.FileApiKey;
}
