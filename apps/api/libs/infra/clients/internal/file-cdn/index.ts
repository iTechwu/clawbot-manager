/**
 * @fileoverview File CDN 客户端导出
 *
 * 本模块提供 CDN URL 生成服务的统一封装。
 *
 * 支持的 CDN 供应商：
 * - 火山引擎图片 CDN
 * - CloudFlare 图片优化
 * - 通用文件下载 CDN
 * - 视频点播 CDN
 *
 * @module file-cdn
 *
 * @example
 * ```typescript
 * // 导入模块
 * import { FileCdnModule, FileCdnClient } from '@app/clients/internal/file-cdn';
 *
 * // 在 NestJS 模块中使用
 * @Module({
 *   imports: [FileCdnModule],
 * })
 * export class ImageModule {}
 *
 * // 在服务中注入使用
 * @Injectable()
 * class ImageService {
 *   constructor(private readonly cdnClient: FileCdnClient) {}
 * }
 * ```
 */

// 模块导出
export * from './file-cdn.module';

// 客户端导出
export * from './file-cdn.client';

// 类型导出
export * from './dto/file-cdn.dto';
