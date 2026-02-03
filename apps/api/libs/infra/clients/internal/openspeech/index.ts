/**
 * @fileoverview OpenSpeech 语音识别服务导出
 *
 * 本模块提供多云服务商语音识别能力的统一封装。
 *
 * 支持的云服务商：
 * - 阿里云 NLS 录音文件识别
 * - 火山引擎大模型录音文件识别
 *
 * @module openspeech
 *
 * @example
 * ```typescript
 * // 导入模块
 * import { OpenspeechModule, OpenspeechClient } from '@app/clients/internal/openspeech';
 *
 * // 在 NestJS 模块中使用
 * @Module({
 *   imports: [OpenspeechModule],
 * })
 * export class MyModule {}
 *
 * // 在服务中注入使用
 * @Injectable()
 * class MyService {
 *   constructor(private readonly openspeech: OpenspeechClient) {}
 * }
 * ```
 */

// 模块导出
export * from './openspeech.module';

// 客户端导出
export * from './openspeech.client';

// 工厂导出
export * from './openspeech.factory';

// 类型导出
export * from './types';

// 提供商导出（用于高级场景）
export * from './providers';
