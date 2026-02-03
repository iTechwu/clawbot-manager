/**
 * File Storage Interface
 *
 * 定义所有文件存储客户端需要实现的接口
 */
import { StreamingBlobPayloadInputTypes } from '@smithy/types';
import {
  PardxUploader,
  GetObjectOptions,
  PresignedPutUrlObject,
  PutObjectOptions,
} from './dto/file.dto';
import { PardxApp } from '@/config/dto/config.dto';
import { StorageCredentialsConfig, AppConfig } from '@/config/validation';
import { ReadStream } from 'fs';

export interface FileStorageInterface {
  // ...
  config: PardxUploader.Config;
  appConfig: AppConfig;
  storageConfig: StorageCredentialsConfig;

  uploadToken(scope?: string, options?: any): Promise<string>;

  setFileContentDisposition(fileKey: string, bucket?: string): Promise<void>;

  uploadTokenWithCallback(
    callbackAuthKey?: string,
    scope?: string,
    options?: any,
    neeSpiltPart?: boolean,
  ): Promise<string>;

  getConfig(): PardxUploader.Config;

  listFilesPrefix(
    prefix?: string,
    limit?: number,
    delimiter?: string,
    bucket?: string,
    options?: any,
  ): Promise<any>;

  deleteFile(fileKey: string, bucket?: string): Promise<any>;

  batchDeleteFiles(fileKey: string[], bucket?: string): Promise<any>;

  getFileInfo(fileKey: string, bucket?: string): Promise<any>;

  getMultipartUploadId(key: string, bucket?: string): Promise<string>;

  completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: { ETag: string; PartNumber: number }[],
    bucket?: string,
  ): Promise<void>;

  getPresignedUrl(
    bucket?: string,
    uploadId?: string,
    key?: string,
    partNumber?: number,
  ): Promise<string>;

  getPrivateDownloadUrl(
    fileKey: string,
    deadline?: number,
    internal?: boolean,
    bucket?: string,
  ): Promise<string>;

  getSnapshot?(
    fileKey: string,
    internal?: boolean,
    bucket?: string,
    time?: number,
    width?: number,
    height?: number,
    format?: string,
  ): Promise<string>;

  getVideoInfo?(
    fileKey: string,
    internal?: boolean,
    bucket?: string,
  ): Promise<any>;

  getImageInfo?(
    fileKey: string,
    internal?: boolean,
    bucket?: string,
  ): Promise<any>;

  getAudioInfo?(
    fileKey: string,
    internal?: boolean,
    bucket?: string,
  ): Promise<any>;

  fetchToBucket(resUrl: string, fileKey: string, bucket?: string): Promise<any>;

  uploadFile(filePath: string, key: string, bucket?: string): Promise<void>;

  fileDataUploader(
    base64Data: string,
    key: string,
    bucket?: string,
  ): Promise<void>;

  fileDownloader(source: PardxApp.FileBase);

  fileUploader(buffer: Buffer, destination: PardxApp.FileBase): Promise<void>;
}
