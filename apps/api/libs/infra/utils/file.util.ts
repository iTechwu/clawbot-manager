import { FileBucketVendor, FileSource } from '@prisma/client';
import stringUtil from './string.util';
import timerUtil from './timer.util';
import { PardxApp } from '@/config/dto/config.dto';
import enviromentUtil from './enviroment.util';

const imageExtensions = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'tiff',
  'tif',
  'svg',
  'psd',
  'avif',
  'heif',
  'heic',
  'ai',
  'eps',
  'raw',
  'heric',
  'jp2',
  'pgm',
  'ppm',
  'pnm',
  'tga',
  'exr',
  'dds',
  'ico',
  'pcx',
];

const videoExtensions = [
  'mp4',
  'avi',
  'mov',
  'mkv',
  'webm',
  'flv',
  'wmv',
  '3gp',
  'vob',
  'm4v',
  'ogg',
  'ts',
];

const audioExtensions = [
  'mp3',
  'wav',
  'aac',
  'flac',
  'alac',
  'wma',
  'ogg',
  'm4a',
  'aiff',
  'pcm',
];

const pdfExtensions = ['pdf'];

const ebookExtensions = [
  'epub',
  'mobi',
  'azw',
  'azw3',
  'kf8',
  'lit',
  'lrf',
  'fb2',
  'ibooks',
  'cbr',
  'cbz',
];

const documentExtensions = [
  'doc',
  'docx',
  'odt',
  'rtf',
  'tex',
  'txt',
  'wpd',
  'wps',
];

/**
 * 文件类型工具
 * 从文件名推断文件类型
 */

const FILE_TYPE_MAP: Record<string, string> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'docx',
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpeg',
  html: 'html',
};

export default {
  /**
   * 从文件名推断文件类型
   */
  getFileTypeFromName(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    return FILE_TYPE_MAP[extension || ''] || 'pdf';
  },

  /**
   * 根据文件扩展名获取MIME类型
   *
   * @param ext 文件扩展名
   * @returns MIME类型字符串
   */
  getMimeType(ext: string): string {
    const mimeTypes = {
      // 图片
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      svg: 'image/svg+xml',

      // 视频
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      '3gp': 'video/3gpp',
      ogg: 'video/ogg',
      webm: 'video/webm',
      m4v: 'video/x-m4v',
      ts: 'video/mp2t',

      // 音频
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      aac: 'audio/aac',
      flac: 'audio/flac',
      wma: 'audio/x-ms-wma',
      m4a: 'audio/mp4',
      aiff: 'audio/aiff',

      // 文档
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      rtf: 'application/rtf',

      // 电子书
      epub: 'application/epub+zip',
      mobi: 'application/x-mobipocket-ebook',
      azw: 'application/vnd.amazon.ebook',
      azw3: 'application/vnd.amazon.ebook',
    };

    const extension = ext.toLowerCase().replace('.', '');
    return (
      mimeTypes[extension as keyof typeof mimeTypes] ??
      'application/octet-stream'
    );
  },
  /**
   * 判断给定的文件名是否为图片文件
   *
   * @param filename 文件名
   * @returns 若文件名是图片文件，则返回true；否则返回false
   */
  isImageFile(ext: string): boolean {
    return imageExtensions.some((extension) =>
      ext.toLowerCase().endsWith(extension),
    );
  },

  isVideoFile(ext: string): boolean {
    return videoExtensions.some((extension) =>
      ext.toLowerCase().endsWith(extension),
    );
  },

  isAudioFile(ext: string): boolean {
    return audioExtensions.some((extension) =>
      ext.toLowerCase().endsWith(extension),
    );
  },

  isPdfFile(ext: string): boolean {
    return pdfExtensions.some((extension) =>
      ext.toLowerCase().endsWith(extension),
    );
  },

  isEbookFile(ext: string): boolean {
    return ebookExtensions.some((extension) =>
      ext.toLowerCase().endsWith(extension),
    );
  },

  isDocumentFile(ext: string): boolean {
    return documentExtensions.some((extension) =>
      ext.toLowerCase().endsWith(extension),
    );
  },

  buildPythonS3Uri(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
    region = 'cn-sh2',
  ): string {
    if (vendor === FileBucketVendor.oss) {
      return `oss://${bucket}/${key}`;
    } else {
      return `s3://${vendor}@${region}/${bucket}/${key}`;
    }
  },

  /**
   * 根据存储厂商、bucket、key 构建统一的源文件 URI（s3://、oss://、tos:// 等）
   * 作为底层构建函数，供转码等模块复用。
   */
  buildStorageUri(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
  ): string {
    if (!bucket || bucket.trim() === '') {
      throw new Error('Bucket cannot be empty');
    }
    if (!key || key.trim() === '') {
      throw new Error('Key cannot be empty');
    }
    if (!vendor || vendor.trim() === '') {
      throw new Error('Vendor cannot be empty');
    }

    const cleanBucket = bucket.trim();
    const cleanKey = key.trim();
    const cleanVendor = vendor.trim() ? vendor.trim() : vendor;

    switch (cleanVendor) {
      case 'oss':
        return `oss://${cleanBucket}/${cleanKey}`;
      case 'us3':
        return `us3://${cleanBucket}/${cleanKey}`;
      case 'qiniu':
        return `qiniu://${cleanBucket}/${cleanKey}`;
      case 's3':
        return `s3://${cleanBucket}/${cleanKey}`;
      case 'gcs':
        return `gcs://${cleanBucket}/${cleanKey}`;
      case 'tos':
        return `tos://${cleanBucket}/${cleanKey}`;
      default:
        // 默认使用 OSS 格式，避免因未知 vendor 导致崩溃
        return `oss://${cleanBucket}/${cleanKey}`;
    }
  },

  /**
   * 根据视频原始 key 构建音频文件 key。
   * 规则与 Aliyun IMM / Volcengine TOS 中的 buildAudioExtractKey 保持一致：
   *  original.mp4 -> original_audio.mp3
   */
  buildAudioKeyFromVideoKey(originalKey: string, format = 'mp3'): string {
    const pathParts = originalKey.split('/');
    const fileName = pathParts.pop() || '';
    const basePath = pathParts.join('/');

    // 移除原文件扩展名
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    // 生成音频文件名
    const audioFileName = `${nameWithoutExt}.${format}`;

    return basePath ? `${basePath}/${audioFileName}` : audioFileName;
  },

  getPrivateBucketFromKey(key: string): PardxApp.FileBase {
    const arr = key.split('/');
    return { vendor: arr[0] as FileBucketVendor, bucket: arr[1], key };
  },

  getVideoWidthAndHeight(videoInfo: {
    width?: string;
    height?: string;
    sar?: string;
  }) {
    let actualWidth: number | undefined;
    let actualHeight: number | undefined;

    if (videoInfo?.width && videoInfo?.height && videoInfo?.sar) {
      const widthNum = parseInt(videoInfo?.width);
      const heightNum = parseInt(videoInfo?.height);
      const [a, b] = videoInfo?.sar?.split(':').map(Number) ?? [];
      if (a > b) {
        actualWidth = (widthNum / a) * b;
        actualHeight = heightNum;
      } else {
        actualWidth = widthNum;
        actualHeight = (heightNum * a) / b;
      }
    }
    return {
      actualWidth,
      actualHeight,
    };
  },

  addFileNameSuffix(fileName: string, suffix: string) {
    let baseName: string;
    let extension: string;
    if (fileName.includes('.')) {
      baseName = fileName.split('.').slice(0, -1).join('.'); // 获取不带扩展名的文件名部分
      extension = fileName.split('.').pop(); // 获取扩展名
    } else {
      baseName = fileName;
      extension = '';
    }
    return `${baseName}${suffix}.${extension}`; // 组合新的文件名
  },

  renameFileWithNumber(
    fileName: string,
    num: number,
    hasTime?: boolean,
    unique?: boolean,
  ): string {
    hasTime = hasTime || false;
    let baseName, extension;
    if (fileName.includes('.')) {
      baseName = fileName.split('.').slice(0, -1).join('.'); // 获取不带扩展名的文件名部分
      extension = fileName.split('.').pop(); // 获取扩展名
    } else {
      baseName = fileName;
      extension = '';
    }
    unique = unique || false;
    if (unique) {
      baseName += '-' + stringUtil.stringGen(4);
    }
    return `${baseName}-${hasTime ? timerUtil.getCurrentDateTimeFormatted() + (num > 0 ? '-' : 0) : ''}${num > 0 ? 'v' + num : ''}.${extension}`; // 组合新的文件名
  },

  renameFolderWithNumber(
    folderName: string,
    num: number,
    hasTime = false,
    formatDay = true,
  ): string {
    hasTime = hasTime || false;
    return `${folderName}-${hasTime ? timerUtil.getCurrentDateTimeFormatted(formatDay) + '-' : ''}v${num}`; // 组合新的文件名
  },

  /**
   * 获取文件扩展名
   *
   * @param fileName 文件名
   * @returns 返回文件扩展名（小写），如果文件名没有扩展名或者以点结束，则返回 null
   */
  getFileExtension(fileName: string): string | null {
    // 首先检查文件名是否为空或者是否以'.'结束，这些情况直接返回null
    if (!fileName || fileName.endsWith('.')) {
      return null;
    }
    // 使用'.'分割文件名，获取可能的扩展名部分
    const parts = fileName.split('.');
    // 如果分割后的数组长度大于1，说明文件名中包含'.'，可能有扩展名
    if (parts.length > 1) {
      // 获取最后一个部分作为扩展名，并转换为小写返回
      const extension = parts.pop();
      return extension ? extension.toLowerCase() : null;
    }
    // 如果没有'.'或者只有一个'.'在文件名开头（没有扩展名），返回null
    return null;
  },

  /**
   * 获取文件的基本名称（不包含扩展名）
   *
   * @param fileName 文件名
   * @returns 返回不包含扩展名的文件基本名称
   */
  getFileBaseName(name: string, ext = ''): string {
    if (!name) return name;

    // If an extension is provided and the name ends with that extension, remove it
    if (ext && name.endsWith(`.${ext}`)) {
      return name.slice(0, -ext.length - 1);
    }

    // Find the last index of '.' to separate the base name from the extension
    const lastIndex = name.lastIndexOf('.');
    return lastIndex !== -1 ? name.substring(0, lastIndex) : name;
  },

  completeKeyString(fileKey: Partial<FileSource> | PardxApp.FileBase): string {
    const key = fileKey.key;
    const ext = fileKey?.ext ? `.${fileKey.ext}` : '';
    const nodeEnv = fileKey?.env || enviromentUtil.getEnv();
    if (stringUtil.isUUID(key) && !stringUtil.isUUID(fileKey.key)) {
      return `${fileKey.bucket}/${nodeEnv}/files/${fileKey.key}`;
    } else if (stringUtil.isUUID(key)) {
      return `${fileKey.bucket}/${nodeEnv}/files/${fileKey.key}${ext}`;
    }
    return fileKey.key;
  },

  getS3Uri(bucket: string, key: string, region = 'cn-sh2') {
    return `s3://ucloud@${region}/${bucket}/${key}`;
  },

  transforS3UriToKey(s3Uri: string): {
    bucket: string;
    key: string;
  } {
    if (!s3Uri) return { bucket: '', key: '' };
    if (s3Uri.startsWith('s3://')) {
      s3Uri = s3Uri.replace('s3://', '');
      const arr = s3Uri.split('/');
      return {
        bucket: arr[1],
        key: arr.slice(2).join('/'),
      };
    } else {
      return { bucket: '', key: '' };
    }
  },

  getKeyFromCdnString(cdnUrl: string) {
    const urlWithoutQuery = cdnUrl.split('?')[0];
    const urlParts = urlWithoutQuery.split('/');
    const keyWithExt = urlParts[urlParts.length - 1].split('~')[0];
    const key = keyWithExt.split('.')[0]; // 移除文件扩展名
    return key;
  },
};
