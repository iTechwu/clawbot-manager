import { uploaderClient } from '../api/contracts/client';
import { UploadError, UploadErrorCode } from './errors';
import type {
  FileSourceResponse,
  TokenResponse,
  UploadMetadata,
} from '@repo/contracts';

// Re-export UploadMetadata type from contracts
export type { UploadMetadata };

// Helper function: extract error message from response (for logging only)
function getErrorMsg(body: unknown, defaultMsg: string): string {
  if (
    body &&
    typeof body === 'object' &&
    'msg' in body &&
    typeof body.msg === 'string'
  ) {
    return body.msg;
  }
  return defaultMsg;
}

/**
 * 获取私有上传 Token 参数
 */
export interface GetUploadTokenParams {
  filename: string;
  signature: string;
  fsize: number;
  thumbImg?: string;
  sha256?: string;
  metadata?: UploadMetadata;
}

/**
 * 上传 Token 响应数据
 */
export type UploadTokenData = TokenResponse;

export async function getUploadTokenPrivate(
  params: GetUploadTokenParams,
): Promise<UploadTokenData> {
  const response = await uploaderClient.getPrivateToken({
    body: {
      filename: params.filename,
      signature: params.signature,
      fsize: params.fsize,
      sha256: params.sha256,
      metadata: params.metadata,
    },
  });

  if (response.status === 200) {
    return response.body.data;
  }

  console.error(getErrorMsg(response.body, 'Failed to get upload token'));
  throw new UploadError(UploadErrorCode.GET_UPLOAD_TOKEN_FAILED);
}

/**
 * 初始化分片上传参数
 */
export interface InitMultipartUploadParams {
  signature: string;
  filename: string;
  fsize: number;
  sha256?: string;
  metadata?: UploadMetadata;
}

/**
 * 初始化分片上传响应数据
 */
export type InitMultipartUploadData = TokenResponse;

export async function initMultipartUpload(
  params: InitMultipartUploadParams,
): Promise<InitMultipartUploadData> {
  const response = await uploaderClient.initMultipart({
    body: {
      signature: params.signature,
      filename: params.filename,
      fsize: params.fsize,
      sha256: params.sha256,
      metadata: params.metadata,
    },
  });

  if (response.status === 200) {
    return response.body.data;
  }

  console.error(getErrorMsg(response.body, 'Failed to init multipart upload'));
  throw new UploadError(UploadErrorCode.INIT_MULTIPART_FAILED);
}

/**
 * 获取分片上传 Token 参数
 */
export interface GetChunkUploadTokenParams {
  signature: string;
  filename: string;
  uploadId: string;
  partNumber: number;
  fsize: number;
  key: string;
}

/**
 * 分片上传 Token 响应数据
 */
export interface ChunkUploadTokenData {
  token: string;
}

export async function getChunkUploadToken(
  params: GetChunkUploadTokenParams,
): Promise<ChunkUploadTokenData> {
  const response = await uploaderClient.getMultipartToken({
    body: {
      signature: params.signature,
      filename: params.filename,
      uploadId: params.uploadId,
      partNumber: params.partNumber,
      fsize: params.fsize,
      key: params.key,
    },
  });

  if (response.status === 200) {
    return { token: response.body.data.token || '' };
  }

  console.error(getErrorMsg(response.body, 'Failed to get chunk upload token'));
  throw new UploadError(UploadErrorCode.GET_CHUNK_TOKEN_FAILED);
}

/**
 * 完成上传参数
 */
export interface CompleteUploadParams {
  signature: string;
  fileId: string;
}

/**
 * 完成上传响应数据
 */
export type CompleteUploadData = FileSourceResponse;

export async function completeUpload(
  params: CompleteUploadParams,
): Promise<CompleteUploadData> {
  const response = await uploaderClient.complete({
    body: {
      signature: params.signature,
      fileId: params.fileId,
    },
  });

  if (response.status === 200) {
    return response.body.data;
  }

  console.error(getErrorMsg(response.body, 'Failed to complete upload'));
  throw new UploadError(UploadErrorCode.COMPLETE_UPLOAD_FAILED);
}

/**
 * 取消上传参数
 */
export interface AbortUploadParams {
  signature: string;
  fileId: string;
}

export async function abortUpload(params: AbortUploadParams): Promise<void> {
  const response = await uploaderClient.abort({
    body: {
      signature: params.signature,
      fileId: params.fileId,
    },
  });

  if (response.status !== 200) {
    console.error(getErrorMsg(response.body, 'Failed to abort upload'));
    throw new UploadError(UploadErrorCode.ABORT_UPLOAD_FAILED);
  }
}
