import * as CryptoJS from 'crypto-js';

/**
 * 计算文件 SHA256 哈希值（非阻塞版本）
 * @param file 文件对象
 * @param onProgress 进度回调 (0-100)
 * @returns Promise<string> SHA256 哈希值
 */
export function calculateSHA256(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const hash = CryptoJS.algo.SHA256.create();
  const chunkSize = 1024 * 1024 * 2; // 2MB 块大小
  let processedSize = 0;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    function processNextChunk() {
      if (processedSize >= file.size) {
        // 计算完成
        const sha256Hash = hash.finalize();
        onProgress?.(100);
        resolve(sha256Hash.toString());
        return;
      }

      // 计算当前进度
      const progress = Math.round((processedSize / file.size) * 100);
      onProgress?.(progress);

      // 读取下一块
      const end = Math.min(processedSize + chunkSize, file.size);
      const slice = file.slice(processedSize, end);
      reader.readAsArrayBuffer(slice);
    }

    reader.onloadend = function () {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

        // 更新哈希对象
        hash.update(wordArray);
        processedSize += arrayBuffer.byteLength;

        // 使用 setTimeout 让出控制权，避免阻塞UI
        setTimeout(processNextChunk, 0);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function () {
      reject(new Error('文件读取失败'));
    };

    // 开始处理第一块
    processNextChunk();
  });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
}

/**
 * 创建文件分片
 * @param file 文件对象
 * @param chunkSize 分片大小（默认 8MB）
 * @returns Blob[] 分片数组
 */
export function createFileChunks(
  file: File,
  chunkSize: number = 8 * 1024 * 1024,
): Blob[] {
  const chunks: Blob[] = [];
  let current = 0;

  while (current < file.size) {
    const chunk = file.slice(current, current + chunkSize);
    chunks.push(chunk);
    current += chunkSize;
  }

  return chunks;
}

/**
 * 判断是否为图片文件
 * @param fileType MIME 类型（如 'image/jpeg'）
 * @param fileName 文件名（如 'photo.jpg'）
 * @returns 是否为图片
 */
export function isImage(fileType?: string, fileName?: string): boolean {
  if (fileType) {
    return fileType.startsWith('image/');
  }
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(
      ext || '',
    );
  }
  return false;
}

/**
 * 判断是否为视频文件
 * @param fileType MIME 类型（如 'video/mp4'）
 * @param fileName 文件名（如 'video.mp4'）
 * @returns 是否为视频
 */
export function isVideo(fileType?: string, fileName?: string): boolean {
  if (fileType) {
    return fileType.startsWith('video/');
  }
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext || '');
  }
  return false;
}

/**
 * 判断是否为音频文件
 * @param fileType MIME 类型（如 'audio/mpeg'）
 * @param fileName 文件名（如 'music.mp3'）
 * @returns 是否为音频
 */
export function isAudio(fileType?: string, fileName?: string): boolean {
  if (fileType) {
    return fileType.startsWith('audio/');
  }
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma'].includes(
      ext || '',
    );
  }
  return false;
}

/**
 * 判断是否为文档文件
 * @param fileType MIME 类型
 * @param fileName 文件名
 * @returns 是否为文档
 */
export function isDocument(fileType?: string, fileName?: string): boolean {
  const docMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];
  if (fileType && docMimeTypes.includes(fileType)) {
    return true;
  }
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
      'csv',
      'rtf',
    ].includes(ext || '');
  }
  return false;
}

/**
 * 判断是否为压缩文件
 * @param fileType MIME 类型
 * @param fileName 文件名
 * @returns 是否为压缩文件
 */
export function isArchive(fileType?: string, fileName?: string): boolean {
  const archiveMimeTypes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
  ];
  if (fileType && archiveMimeTypes.includes(fileType)) {
    return true;
  }
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext || '');
  }
  return false;
}

/**
 * 文件类型分类
 */
export type FileTypeCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'docs'
  | 'zips'
  | 'others';

/**
 * 获取文件的类型分类
 * @param file 文件对象或文件名
 * @returns 文件类型分类
 */
export function getFileTypeCategory(file: File | string): FileTypeCategory {
  const fileName = typeof file === 'string' ? file : file.name;
  const fileType = typeof file === 'string' ? undefined : file.type;

  if (isImage(fileType, fileName)) return 'image';
  if (isVideo(fileType, fileName)) return 'video';
  if (isAudio(fileType, fileName)) return 'audio';
  if (isDocument(fileType, fileName)) return 'docs';
  if (isArchive(fileType, fileName)) return 'zips';
  return 'others';
}

/**
 * 根据允许的文件类型过滤文件
 * @param files 文件列表
 * @param allowedTypes 允许的类型（空数组表示允许所有类型）
 * @returns 过滤结果：allowed（允许的文件）和 rejected（拒绝的文件及原因）
 */
export function filterFilesByType(
  files: File[],
  allowedTypes: FileTypeCategory[],
): {
  allowed: File[];
  rejected: { file: File; category: FileTypeCategory }[];
} {
  // 如果允许类型为空数组，则允许所有文件
  if (!allowedTypes || allowedTypes.length === 0) {
    return { allowed: files, rejected: [] };
  }

  const allowed: File[] = [];
  const rejected: { file: File; category: FileTypeCategory }[] = [];

  for (const file of files) {
    const category = getFileTypeCategory(file);
    if (allowedTypes.includes(category)) {
      allowed.push(file);
    } else {
      rejected.push({ file, category });
    }
  }

  return { allowed, rejected };
}
