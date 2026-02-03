import { uploadFile, type UploadResult } from './uploader';
import { UploadError, UploadErrorCode } from './errors';
import type { UploadMetadata } from './api';

export interface FileUploadProgress {
  fileName: string;
  fileSize: number;
  progress: number;
  calculatingProgress?: number; // SHA256 计算进度 (0-100)
  status:
    | 'pending'
    | 'calculating'
    | 'uploading'
    | 'instant'
    | 'success'
    | 'error';
  error?: string;
  fileId?: string;
  isInstantUpload?: boolean;
  uploadSpeed?: number; // 上传速度 (bytes/s)
}

export interface BatchUploadProgress {
  files: FileUploadProgress[];
  totalProgress: number;
  completedCount: number;
  totalCount: number;
  isCompleted: boolean;
}

export interface BatchUploadOptions {
  files: File[];
  metadata?: UploadMetadata;
  onProgress?: (progress: BatchUploadProgress) => void;
  onFileComplete?: (
    file: File,
    fileId: string,
    result: UploadResult,
    isInstant: boolean,
  ) => void;
}

// 并发控制：限制同时上传的文件数量
const MAX_CONCURRENT_UPLOADS = 3;

/**
 * 批量上传文件（带并发控制）
 */
export async function uploadFiles(
  options: BatchUploadOptions,
): Promise<{ success: number; failed: number }> {
  const { files, metadata, onProgress, onFileComplete } = options;

  if (files.length === 0) {
    return { success: 0, failed: 0 };
  }

  const fileProgresses: FileUploadProgress[] = files.map((file) => ({
    fileName: file.name,
    fileSize: file.size,
    progress: 0,
    status: 'pending',
  }));

  let completedCount = 0;
  const totalFiles = files.length;

  // 更新进度回调
  const updateProgress = () => {
    const totalProgress =
      fileProgresses.reduce((sum, fp) => sum + fp.progress, 0) / totalFiles;
    const progress: BatchUploadProgress = {
      files: [...fileProgresses],
      totalProgress,
      completedCount,
      totalCount: totalFiles,
      isCompleted: completedCount === totalFiles,
    };
    onProgress?.(progress);
  };

  const results: { success: boolean }[] = [];

  // 分组处理，每组最多 MAX_CONCURRENT_UPLOADS 个文件
  for (let i = 0; i < files.length; i += MAX_CONCURRENT_UPLOADS) {
    const batch = files.slice(i, i + MAX_CONCURRENT_UPLOADS);
    const batchIndexes = batch.map((_, idx) => i + idx);

    // 并行处理当前批次
    const batchPromises = batch.map(async (file, batchIdx) => {
      const fileIndex = batchIndexes[batchIdx];
      if (fileIndex === undefined) {
        return { success: false };
      }
      const fileProgress = fileProgresses[fileIndex];
      if (!fileProgress) {
        return { success: false };
      }

      try {
        // 更新状态为计算中
        fileProgress.status = 'calculating';
        fileProgress.calculatingProgress = 0;
        updateProgress();

        let lastLoaded = 0;
        let lastTime = Date.now();

        const result = await uploadFile({
          file,
          metadata,
          callbacks: {
            onCalculating: (progress) => {
              fileProgress.calculatingProgress = progress;
              if (progress === 100) {
                fileProgress.status = 'uploading';
                fileProgress.progress = 0;
              }
              updateProgress();
            },
            onStart: (fileId) => {
              fileProgress.fileId = fileId;
              fileProgress.status = 'uploading';
              updateProgress();
            },
            onProgress: (progress) => {
              // 计算上传速度
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000;
              if (timeDiff > 0.1) {
                const loadedDiff = progress.loaded - lastLoaded;
                fileProgress.uploadSpeed = Math.round(loadedDiff / timeDiff);
                lastLoaded = progress.loaded;
                lastTime = now;
              }
              // 确保进度值在 0-100 范围内
              fileProgress.progress = Math.min(
                100,
                Math.max(0, progress.percentage),
              );
              updateProgress();
            },
            onComplete: (completeResult) => {
              // 从完成结果中提取 fileId
              const completedFileId = getFileIdFromResult(completeResult);
              if (completedFileId) {
                fileProgress.fileId = completedFileId;
              }

              fileProgress.status = 'success';
              fileProgress.progress = 100;
              fileProgress.uploadSpeed = undefined;
              completedCount++;
              updateProgress();
            },
            onError: (error) => {
              fileProgress.status = 'error';
              fileProgress.progress = 0;
              // Store error code for i18n translation in UI layer
              fileProgress.error =
                error instanceof UploadError
                  ? error.code
                  : UploadErrorCode.UPLOAD_FAILED;
              fileProgress.uploadSpeed = undefined;
              completedCount++;
              updateProgress();
            },
          },
        });

        // 获取文件 ID
        const fileId = getFileIdFromResult(result);
        if (fileId && fileProgress.fileId !== fileId) {
          fileProgress.fileId = fileId;
        }

        // 调用文件完成回调
        if (fileProgress.fileId) {
          onFileComplete?.(file, fileProgress.fileId, result, false);
        }

        return { success: true };
      } catch (error) {
        fileProgress.status = 'error';
        fileProgress.progress = 0;
        fileProgress.error =
          error instanceof UploadError
            ? error.code
            : UploadErrorCode.UPLOAD_FAILED;
        completedCount++;
        updateProgress();

        return { success: false };
      }
    });

    // 等待当前批次完成
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  return { success: successCount, failed: failedCount };
}

/**
 * 从上传结果中提取文件 ID
 */
function getFileIdFromResult(result: UploadResult): string | null {
  if ('id' in result && result.id) {
    return result.id;
  }
  if ('fileId' in result && result.fileId) {
    return result.fileId;
  }
  return null;
}
