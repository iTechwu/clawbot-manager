/**
 * @fileoverview OpenSpeech 语音识别服务客户端
 *
 * 本文件是语音识别服务的统一入口（Facade 模式），提供了简洁的 API 接口，
 * 内部通过工厂模式委托给具体的云服务商实现。
 *
 * 架构说明：
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      OpenspeechClient                       │
 * │                     （Facade 门面）                          │
 * └─────────────────────────────┬───────────────────────────────┘
 *                               │
 *                               ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                 OpenspeechProviderFactory                   │
 * │                    （工厂模式）                              │
 * └──────────────┬──────────────────────────────┬───────────────┘
 *                │                              │
 *                ▼                              ▼
 * ┌──────────────────────────┐    ┌──────────────────────────────┐
 * │  AliyunOpenspeechProvider │    │ VolcengineOpenspeechProvider │
 * │      （阿里云实现）         │    │      （火山引擎实现）         │
 * └──────────────────────────┘    └──────────────────────────────┘
 * ```
 *
 * @module openspeech/client
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FileBucketVendor, FileSource } from '@prisma/client';

import { FileStorageService } from '@app/shared-services/file-storage';
import fileUtil from '@/utils/file.util';
import { OpenspeechProviderFactory } from './openspeech.factory';
import {
  SubmitTaskResult,
  TaskStatusResult,
  StreamingConnectParams,
  StreamingAsrCallbacks,
  StreamingAsrStatus,
  IStreamingAsrProvider,
} from './types';

/**
 * OpenSpeech 语音识别服务客户端
 *
 * @description 作为语音识别服务的统一门面，提供以下核心功能：
 *
 * 1. **任务提交** - `submitTranscribeTask`
 *    根据 FileKey 自动选择云服务商，提交语音识别任务
 *
 * 2. **状态查询** - `queryTranscribeTaskStatus`
 *    查询指定任务的处理状态和结果
 *
 * 3. **同步识别** - `transcribeFromFileKey`
 *    提交任务并轮询等待结果（阻塞式，向后兼容）
 *
 * 云服务商选择逻辑：
 * - 优先使用 `preferVendor` 参数指定的云服务商
 * - 默认根据 FileKey 的 vendor 字段选择
 * - oss -> 阿里云, tos -> 火山引擎
 *
 * @class OpenspeechClient
 *
 * @example
 * ```typescript
 * // 注入客户端
 * @Injectable()
 * class VideoService {
 *   constructor(private readonly openspeech: OpenspeechClient) {}
 *
 *   // 异步任务模式（推荐）
 *   async startTranscription(fileKey: FileKey) {
 *     const { vendor, vendorTaskId } = await this.openspeech.submitTranscribeTask(fileKey);
 *     // 保存 vendorTaskId，通过回调或轮询获取结果
 *     return { vendor, vendorTaskId };
 *   }
 *
 *   // 查询任务状态
 *   async checkStatus(vendor: FileBucketVendor, taskId: string) {
 *     return await this.openspeech.queryTranscribeTaskStatus(vendor, taskId);
 *   }
 *
 *   // 同步模式（阻塞等待，适用于简单场景）
 *   async transcribeSync(fileKey: FileKey) {
 *     return await this.openspeech.transcribeFromFileKey(fileKey);
 *   }
 * }
 * ```
 */
@Injectable()
export class OpenspeechClient {
  /**
   * 构造函数
   *
   * @param {FileStorageService} fileApi - 文件存储服务
   * @param {OpenspeechProviderFactory} providerFactory - 提供商工厂
   * @param {Logger} logger - Winston 日志记录器
   */
  constructor(
    private readonly fileApi: FileStorageService,
    private readonly providerFactory: OpenspeechProviderFactory,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 根据 FileKey 提交语音识别任务
   *
   * @description 根据文件信息自动选择云服务商并提交识别任务。
   *
   * 处理流程：
   * 1. 验证 FileKey 的必要字段
   * 2. 根据视频 key 推导音频 key
   * 3. 获取存储桶配置，拼接音频 HTTP URL
   * 4. 选择云服务商（优先级：preferVendor > vendor）
   * 5. 调用对应提供商提交任务
   *
   * @param {Partial<FileKey>} fileKey - 文件信息
   * @param {FileBucketVendor} [fileKey.vendor] - 存储服务商（必填）
   * @param {string} [fileKey.bucket] - 存储桶名称（必填）
   * @param {string} [fileKey.key] - 文件路径（必填）
   * @param {FileBucketVendor} [(fileKey as any).preferVendor] - 优先使用的云服务商
   * @returns {Promise<SubmitTaskResult>} 任务提交结果
   * @throws {Error} FileKey 无效或提交失败时抛出异常
   *
   * @example
   * ```typescript
   * // 基本用法
   * const result = await client.submitTranscribeTask({
   *   vendor: 'oss',
   *   bucket: 'my-bucket',
   *   key: 'videos/example.mp4',
   * });
   * console.log('Task ID:', result.vendorTaskId);
   *
   * // 指定使用火山引擎
   * const result = await client.submitTranscribeTask({
   *   vendor: 'oss',
   *   bucket: 'my-bucket',
   *   key: 'videos/example.mp4',
   *   preferVendor: 'tos',
   * } as any);
   * ```
   */
  async submitTranscribeTask(
    fileKey: Partial<FileSource>,
  ): Promise<SubmitTaskResult> {
    // 参数验证
    if (!fileKey?.vendor || !fileKey?.bucket || !fileKey?.key) {
      throw new Error('Invalid FileKey for openspeech transcription');
    }

    // 根据视频 key 推导音频 key（与转码保持一致）
    const audioKey = fileUtil.buildAudioKeyFromVideoKey(fileKey.key, 'mp3');

    const audioUrl = await this.fileApi.getPrivateDownloadUrl(
      fileKey.vendor,
      fileKey.bucket,
      audioKey,
    );

    this.logger.info('Openspeech transcription submit requested', {
      vendor: fileKey.vendor,
      bucket: fileKey.bucket,
      audioKey,
      audioUrl,
    });

    // 选择云服务商：优先使用 preferVendor，否则根据 fileKey.vendor 选择
    const preferVendor = (fileKey as any).preferVendor as
      | FileBucketVendor
      | undefined;
    const useVendor = preferVendor ?? fileKey.vendor;

    // 获取对应的提供商并提交任务
    const provider = this.providerFactory.getProvider(useVendor);
    const vendorTaskId = await provider.submitTask({ audioUrl });

    return {
      vendor: useVendor,
      vendorTaskId,
      audioUrl,
    };
  }

  /**
   * 查询语音识别任务状态
   *
   * @description 根据云服务商和任务 ID 查询识别任务的状态和结果。
   *
   * 返回状态说明：
   * - `processing`: 任务正在处理中，需要继续轮询
   * - `success`: 识别成功，text 字段包含识别结果
   * - `error`: 识别失败，error 字段包含错误信息
   *
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @param {string} vendorTaskId - 云服务商返回的任务 ID
   * @returns {Promise<TaskStatusResult>} 任务状态和结果
   * @throws {Error} 不支持的 vendor 类型时抛出异常
   *
   * @example
   * ```typescript
   * const result = await client.queryTranscribeTaskStatus('oss', 'task-123');
   *
   * if (result.status === 'success') {
   *   console.log('识别文本:', result.text);
   * } else if (result.status === 'processing') {
   *   // 稍后重试
   *   setTimeout(() => this.checkStatus(), 3000);
   * } else {
   *   console.error('识别失败:', result.error);
   * }
   * ```
   */
  async queryTranscribeTaskStatus(
    vendor: FileBucketVendor,
    vendorTaskId: string,
  ): Promise<TaskStatusResult> {
    const provider = this.providerFactory.getProvider(vendor);
    return provider.queryTaskStatus(vendorTaskId);
  }

  /**
   * 根据 FileKey 进行语音识别（同步阻塞模式）
   *
   * @description 提交任务并轮询等待结果，直到识别完成或失败。
   * 此方法会阻塞直到获得最终结果，适用于简单场景。
   *
   * **注意**：对于生产环境，建议使用异步模式：
   * 1. 调用 `submitTranscribeTask` 提交任务
   * 2. 配置回调 URL 接收结果，或定时调用 `queryTranscribeTaskStatus` 查询
   *
   * @deprecated 建议使用异步模式（submitTranscribeTask + queryTranscribeTaskStatus）
   * @param {Partial<FileKey>} fileKey - 文件信息
   * @returns {Promise<string>} 识别出的文本内容
   * @throws {Error} 识别失败时抛出异常
   *
   * @example
   * ```typescript
   * try {
   *   const text = await client.transcribeFromFileKey({
   *     vendor: 'oss',
   *     bucket: 'my-bucket',
   *     key: 'videos/example.mp4',
   *   });
   *   console.log('识别结果:', text);
   * } catch (error) {
   *   console.error('识别失败:', error.message);
   * }
   * ```
   */
  async transcribeFromFileKey(fileKey: Partial<FileSource>): Promise<string> {
    // 提交任务
    const { vendor, vendorTaskId } = await this.submitTranscribeTask(fileKey);

    // 轮询等待结果
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const result = await this.queryTranscribeTaskStatus(vendor, vendorTaskId);

      if (result.status === 'success') {
        return result.text || '';
      }

      if (result.status === 'error') {
        throw new Error(result.error || 'Transcription failed');
      }

      // processing 状态继续轮询
    }
  }

  // =========================================================================
  // 流式语音识别方法
  // =========================================================================

  /**
   * 建立流式语音识别连接
   *
   * @description 建立 WebSocket 连接用于实时语音识别。
   * 目前仅支持火山引擎 (tos) 流式识别。
   *
   * @param {FileBucketVendor} vendor - 云服务商类型（目前仅支持 'tos'）
   * @param {StreamingConnectParams} params - 连接参数
   * @param {StreamingAsrCallbacks} callbacks - 事件回调
   * @returns {Promise<string>} 连接 ID
   * @throws {Error} 不支持的 vendor 类型或连接失败时抛出异常
   *
   * @example
   * ```typescript
   * const connectionId = await client.connectStreaming(
   *   'tos',
   *   { sessionId: 'session-123', audioFormat: 'pcm' },
   *   {
   *     onResult: (result) => console.log('识别结果:', result.text),
   *     onConnected: () => console.log('已连接'),
   *     onError: (error) => console.error('错误:', error),
   *   }
   * );
   * ```
   */
  async connectStreaming(
    vendor: FileBucketVendor,
    params: StreamingConnectParams,
    callbacks: StreamingAsrCallbacks,
  ): Promise<string> {
    this.logger.info('Openspeech streaming connection requested', {
      vendor,
      sessionId: params.sessionId,
      audioFormat: params.audioFormat,
    });

    const provider = this.providerFactory.getStreamingProvider(vendor);
    return provider.connect(params, callbacks);
  }

  /**
   * 发送音频数据到流式识别连接
   *
   * @description 将音频数据发送到已建立的流式识别连接。
   *
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @param {string} connectionId - 连接 ID
   * @param {Buffer} audioData - 音频数据
   * @param {boolean} [isLast=false] - 是否为最后一帧
   * @throws {Error} 连接不存在或发送失败时抛出异常
   *
   * @example
   * ```typescript
   * // 发送音频数据
   * await client.sendStreamingAudio('tos', connectionId, audioBuffer);
   *
   * // 发送最后一帧
   * await client.sendStreamingAudio('tos', connectionId, lastBuffer, true);
   * ```
   */
  async sendStreamingAudio(
    vendor: FileBucketVendor,
    connectionId: string,
    audioData: Buffer,
    isLast: boolean = false,
  ): Promise<void> {
    const provider = this.providerFactory.getStreamingProvider(vendor);
    return provider.sendAudio(connectionId, audioData, isLast);
  }

  /**
   * 关闭流式识别连接
   *
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @param {string} connectionId - 连接 ID
   *
   * @example
   * ```typescript
   * await client.disconnectStreaming('tos', connectionId);
   * ```
   */
  async disconnectStreaming(
    vendor: FileBucketVendor,
    connectionId: string,
  ): Promise<void> {
    this.logger.info('Openspeech streaming disconnection requested', {
      vendor,
      connectionId,
    });

    const provider = this.providerFactory.getStreamingProvider(vendor);
    return provider.disconnect(connectionId);
  }

  /**
   * 获取流式识别连接状态
   *
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @param {string} connectionId - 连接 ID
   * @returns {StreamingAsrStatus} 连接状态
   *
   * @example
   * ```typescript
   * const status = client.getStreamingStatus('tos', connectionId);
   * if (status === 'streaming') {
   *   // 正在识别中
   * }
   * ```
   */
  getStreamingStatus(
    vendor: FileBucketVendor,
    connectionId: string,
  ): StreamingAsrStatus {
    const provider = this.providerFactory.getStreamingProvider(vendor);
    return provider.getConnectionStatus(connectionId);
  }

  /**
   * 获取流式识别提供商实例
   *
   * @description 直接获取流式识别提供商，用于高级操作。
   *
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @returns {IStreamingAsrProvider} 流式识别提供商实例
   *
   * @example
   * ```typescript
   * const provider = client.getStreamingProvider('tos');
   * const transcript = provider.getTranscript(connectionId);
   * ```
   */
  getStreamingProvider(vendor: FileBucketVendor): IStreamingAsrProvider {
    return this.providerFactory.getStreamingProvider(vendor);
  }

  /**
   * 检查指定云服务商是否支持流式识别
   *
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @returns {boolean} 是否支持流式识别
   *
   * @example
   * ```typescript
   * if (client.isStreamingAvailable('tos')) {
   *   // 使用流式识别
   * }
   * ```
   */
  isStreamingAvailable(vendor: FileBucketVendor): boolean {
    return this.providerFactory.isStreamingAvailable(vendor);
  }

  /**
   * 获取所有支持流式识别的云服务商列表
   *
   * @returns {FileBucketVendor[]} 支持流式识别的云服务商列表
   */
  getStreamingAvailableVendors(): FileBucketVendor[] {
    return this.providerFactory.getStreamingAvailableVendors();
  }
}
