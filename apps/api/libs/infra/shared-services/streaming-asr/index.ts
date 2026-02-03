/**
 * @fileoverview 流式语音识别服务导出
 *
 * 本模块提供流式语音识别的业务服务。
 *
 * 核心功能：
 * - 创建和管理流式识别会话
 * - 实时音频数据传输
 * - 实时识别结果处理
 * - 与会议记录的集成
 *
 * @module streaming-asr
 *
 * @example
 * ```typescript
 * // 导入模块
 * import {
 *   StreamingAsrServiceModule,
 *   StreamingAsrService,
 * } from '@app/shared-services/streaming-asr';
 *
 * // 在 NestJS 模块中使用
 * @Module({
 *   imports: [StreamingAsrServiceModule],
 * })
 * export class MyModule {}
 *
 * // 在服务中注入使用
 * @Injectable()
 * class MyService {
 *   constructor(private readonly streamingAsr: StreamingAsrService) {}
 *
 *   async startSession() {
 *     const session = await this.streamingAsr.createSession({
 *       userId: 'user-uuid',
 *     });
 *     return session;
 *   }
 * }
 * ```
 */

// 模块导出
export * from './streaming-asr.module';

// 服务导出
export * from './streaming-asr.service';

// 类型导出
export * from './types';
