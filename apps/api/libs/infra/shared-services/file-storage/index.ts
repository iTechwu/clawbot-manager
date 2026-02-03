/**
 * @fileoverview 文件存储服务导出
 *
 * 本模块提供多云存储供应商文件存储能力的统一封装。
 *
 * 支持的存储供应商：
 * - AWS S3 兼容存储
 * - 阿里云 OSS
 * - 火山引擎 TOS
 * - UCloud US3
 * - Google Cloud Storage
 * - 七牛云存储
 *
 * @module file-storage
 *
 * @example
 * ```typescript
 * // 导入模块
 * import {
 *   FileStorageServiceModule,
 *   FileStorageService,
 * } from '@app/shared-services/file-storage';
 *
 * // 在 NestJS 模块中使用
 * @Module({
 *   imports: [FileStorageServiceModule],
 * })
 * export class MyModule {}
 *
 * // 在服务中注入使用
 * @Injectable()
 * class MyService {
 *   constructor(private readonly fileStorage: FileStorageService) {}
 * }
 * ```
 */

// 模块导出
export * from './file-storage.module';

// 服务导出
export * from './file-storage.service';

// 工厂导出
export * from './file-storage.factory';

// 存储桶解析器导出
export * from './bucket-resolver';

// 类型导出
export * from './types';

// Re-export DTOs from client layer for convenience
export {
  PardxUploader,
  FileStorageInterface,
} from '@app/clients/internal/file-storage';
