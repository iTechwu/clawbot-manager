/**
 * File Storage Clients
 *
 * 纯文件存储 API 客户端集合
 * - 不访问数据库
 * - 不包含业务逻辑
 */
export { FileS3Client } from './file-s3.client';
export { FileQiniuClient } from './file-qiniu.client';
export { FileGcsClient } from './file-gcs.client';
export { FileTosClient } from './file-tos.client';
export { FileUs3Client } from './file-us3.client';
export { FileStorageInterface } from './file-storage.interface';

// Re-export DTO types
export * from './dto/file.dto';
