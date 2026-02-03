import {
  getUploadTokenPrivate,
  initMultipartUpload,
  getChunkUploadToken,
  completeUpload,
  abortUpload,
  type UploadTokenData,
  type InitMultipartUploadData,
  type CompleteUploadData,
  type UploadMetadata,
} from './api';
import { UploadError, UploadErrorCode } from './errors';
import { encryptParams } from '@repo/utils/encrypt';
import { calculateSHA256, createFileChunks } from '@repo/utils/file';

// 上传结果类型
export type UploadResult =
  | UploadTokenData
  | InitMultipartUploadData
  | CompleteUploadData;

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  partNumber?: number; // 分片编号
}

export interface UploadCallbacks {
  onStart?: (fileId: string, uploadId?: string) => void;
  onCalculating?: (progress: number) => void; // SHA256 计算进度 (0-100)
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export interface UploadParams {
  file: File;
  callbacks?: UploadCallbacks;
  metadata?: UploadMetadata; // 秒传后处理元数据
}

/**
 * 上传文件到 S3
 */
async function uploadToS3(
  url: string,
  chunk: Blob | File,
  partNumber?: number,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ ETag: string; PartNumber: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const progressHandler = (event: ProgressEvent) => {
      if (event.lengthComputable && onProgress) {
        // 确保进度值在 0-100 范围内
        const percentage = Math.min(
          100,
          Math.max(0, Math.round((event.loaded / event.total) * 100)),
        );
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage,
          partNumber,
        });
      }
    };

    const cleanup = () => {
      xhr.upload.removeEventListener('progress', progressHandler);
      xhr.removeEventListener('load', loadHandler);
      xhr.removeEventListener('error', errorHandler);
      xhr.removeEventListener('abort', abortHandler);
    };

    const loadHandler = () => {
      cleanup();
      if (xhr.status === 200) {
        let etag = '';

        // 尝试从响应头获取 ETag
        try {
          const etagHeader = xhr.getResponseHeader('ETag');
          if (etagHeader) {
            etag = etagHeader.replace(/"/g, '');
          }
        } catch (error) {
          console.warn('无法从响应头获取 ETag（CORS 限制）:', error);
        }

        // 如果响应头中没有 ETag，尝试从响应体中解析
        if (!etag) {
          try {
            const responseText = xhr.responseText;
            if (responseText) {
              const response = JSON.parse(responseText);
              if (response.ETag || response.etag) {
                etag = String(response.ETag || response.etag).replace(/"/g, '');
              }
            }
          } catch {
            // 响应体可能不是 JSON 或为空
          }
        }

        if (!etag) {
          console.error('Failed to get ETag from response');
          reject(new UploadError(UploadErrorCode.GET_ETAG_FAILED));
          return;
        }

        resolve({
          ETag: etag,
          PartNumber: partNumber || 1,
        });
      } else {
        reject(
          new UploadError(UploadErrorCode.UPLOAD_STATUS_ERROR, undefined, {
            status: xhr.status,
          }),
        );
      }
    };

    const errorHandler = () => {
      cleanup();
      reject(new UploadError(UploadErrorCode.NETWORK_ERROR));
    };

    const abortHandler = () => {
      cleanup();
      reject(new UploadError(UploadErrorCode.UPLOAD_CANCELLED));
    };

    xhr.upload.addEventListener('progress', progressHandler);
    xhr.addEventListener('load', loadHandler);
    xhr.addEventListener('error', errorHandler);
    xhr.addEventListener('abort', abortHandler);

    xhr.open('PUT', url);
    if (partNumber) {
      xhr.setRequestHeader('PartNumber', partNumber.toString());
    }
    xhr.setRequestHeader(
      'Content-Type',
      chunk.type || 'application/octet-stream',
    );
    xhr.send(chunk);
  });
}

/**
 * 普通上传（文件 <= 8MB）
 */
async function uploadFullFile(
  file: File,
  filename: string,
  fsize: number,
  sha256: string,
  callbacks?: UploadCallbacks,
  metadata?: UploadMetadata,
): Promise<UploadResult> {
  try {
    // 获取上传 Token
    const signature = encryptParams(filename, sha256);
    const tokenResponse = await getUploadTokenPrivate({
      filename,
      signature,
      fsize,
      sha256,
      metadata,
    });

    const fileId = tokenResponse.fileId;

    if (!fileId) {
      throw new UploadError(UploadErrorCode.GET_FILE_ID_FAILED);
    }

    if (!tokenResponse.token || !tokenResponse.key) {
      throw new UploadError(UploadErrorCode.GET_UPLOAD_TOKEN_FAILED);
    }

    callbacks?.onStart?.(fileId);

    // 上传到 S3
    await uploadToS3(tokenResponse.token, file, undefined, (progress) => {
      callbacks?.onProgress?.(progress);
    });

    // 完成上传
    const completeSignature = encryptParams(filename, sha256, fileId);
    const completeResponse = await completeUpload({
      signature: completeSignature,
      fileId: fileId,
    });

    callbacks?.onComplete?.(completeResponse);
    return completeResponse;
  } catch (error) {
    const uploadError =
      error instanceof UploadError
        ? error
        : new UploadError(UploadErrorCode.UPLOAD_FAILED);
    callbacks?.onError?.(uploadError);
    throw uploadError;
  }
}

/**
 * 分片上传（文件 > 8MB）
 */
async function uploadChunkFile(
  file: File,
  filename: string,
  fsize: number,
  sha256: string,
  callbacks?: UploadCallbacks,
  metadata?: UploadMetadata,
): Promise<UploadResult> {
  try {
    // 初始化分片上传
    const signature = encryptParams(filename, sha256);
    const initResponse = await initMultipartUpload({
      signature,
      filename,
      fsize,
      sha256,
      metadata,
    });

    const fileId = initResponse.fileId;

    if (!fileId) {
      throw new UploadError(UploadErrorCode.GET_FILE_ID_FAILED);
    }

    // 需要 uploadId 来进行分片上传
    // 注意：TokenResponse 中没有 uploadId，需要从其他地方获取
    // 这里假设 initMultipart 返回的 token 包含 uploadId 信息
    callbacks?.onStart?.(fileId);

    // 创建分片
    const chunks = createFileChunks(file);
    const chunkProgress: number[] = new Array(chunks.length).fill(0);

    // 上传所有分片（串行，避免进度计算问题）
    const parts: { ETag: string; PartNumber: number }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      const partNumber = i + 1;

      // 获取分片上传 Token
      const chunkSignature = encryptParams(filename);
      const chunkTokenResponse = await getChunkUploadToken({
        signature: chunkSignature,
        filename,
        uploadId: fileId, // 使用 fileId 作为 uploadId
        partNumber,
        fsize,
        key: initResponse.key,
      });

      // 上传分片
      const part = await uploadToS3(
        chunkTokenResponse.token,
        chunk,
        partNumber,
        (progress) => {
          // 更新当前分片进度
          chunkProgress[i] = progress.loaded;
          // 计算总进度，确保在 0-99 范围内
          const totalLoaded = chunkProgress.reduce((sum, p) => sum + p, 0);
          const percentage = Math.min(
            99,
            Math.max(0, Math.round((totalLoaded / fsize) * 100)),
          );

          callbacks?.onProgress?.({
            loaded: totalLoaded,
            total: fsize,
            percentage,
            partNumber,
          });
        },
      );

      parts.push(part);
    }

    // 完成上传
    const completeSignature = encryptParams(filename, sha256, fileId);
    const completeResponse = await completeUpload({
      signature: completeSignature,
      fileId: fileId,
    });

    callbacks?.onComplete?.(completeResponse);
    return completeResponse;
  } catch (error) {
    const uploadError =
      error instanceof UploadError
        ? error
        : new UploadError(UploadErrorCode.UPLOAD_FAILED);
    callbacks?.onError?.(uploadError);
    throw uploadError;
  }
}

/**
 * 自动上传文件（根据文件大小选择普通上传或分片上传）
 */
export async function uploadFile(params: UploadParams): Promise<UploadResult> {
  const { file, callbacks, metadata } = params;
  const filename = file.name;
  const fsize = file.size;
  const CHUNK_SIZE_THRESHOLD = 8 * 1024 * 1024; // 8MB

  try {
    // 计算 SHA256
    callbacks?.onCalculating?.(0);

    const sha256 = await calculateSHA256(file, (progress) => {
      callbacks?.onCalculating?.(progress);
    });

    callbacks?.onCalculating?.(100);

    // 根据文件大小选择上传方式
    if (fsize > CHUNK_SIZE_THRESHOLD) {
      return await uploadChunkFile(
        file,
        filename,
        fsize,
        sha256,
        callbacks,
        metadata,
      );
    } else {
      return await uploadFullFile(
        file,
        filename,
        fsize,
        sha256,
        callbacks,
        metadata,
      );
    }
  } catch (error) {
    const uploadError =
      error instanceof UploadError
        ? error
        : new UploadError(UploadErrorCode.UPLOAD_FAILED);
    callbacks?.onError?.(uploadError);
    throw uploadError;
  }
}

/**
 * 取消上传
 */
export async function cancelUpload(
  filename: string,
  fileId: string,
): Promise<void> {
  const signature = encryptParams(filename, '', fileId);
  await abortUpload({
    signature,
    fileId,
  });
}
