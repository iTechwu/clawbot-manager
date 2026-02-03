/**
 * @fileoverview 火山引擎 OpenSpeech 语音识别服务提供商
 *
 * 本文件实现了火山引擎大模型录音文件识别功能。
 * 火山引擎语音识别服务文档：https://www.volcengine.com/docs/6561/1354868
 *
 * @module openspeech/providers/volcengine
 */

import { Logger } from 'winston';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { FileBucketVendor } from '@prisma/client';
import { BaseOpenspeechProvider } from './base.provider';
import {
  SubmitTaskParams,
  TaskStatusResult,
  VolcengineAucConfig,
} from '../types';
import environmentUtil from '@/utils/enviroment.util';

/**
 * 支持的音频格式列表
 */
const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'm4a', 'aac', 'ogg'];

/**
 * 火山引擎 API 状态码
 */
const VolcengineStatusCode = {
  /** 成功 */
  SUCCESS: '20000000',
  /** 正在处理 */
  PROCESSING: '20000001',
  /** 排队中 */
  QUEUEING: '20000002',
} as const;

/**
 * 火山引擎语音识别服务提供商
 *
 * @description 封装了火山引擎大模型录音文件识别的核心功能：
 * - 任务提交：将音频文件提交到火山引擎进行语音识别
 * - 状态查询：查询识别任务的处理状态和结果
 *
 * API 调用方式：
 * - 通过 HTTP 请求调用火山引擎 API
 * - 使用自定义请求头传递认证信息
 * - 支持回调通知
 *
 * @class VolcengineOpenspeechProvider
 * @extends {BaseOpenspeechProvider}
 *
 * @example
 * ```typescript
 * const provider = new VolcengineOpenspeechProvider(logger, httpService, {
 *   appId: 'your-app-id',
 *   appAccessToken: 'your-access-token',
 *   endpoint: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel',
 *   uid: 'your-user-id',
 * });
 *
 * // 提交任务
 * const taskId = await provider.submitTask({
 *   audioUrl: 'https://example.com/audio.mp3',
 * });
 *
 * // 查询状态
 * const result = await provider.queryTaskStatus(taskId);
 * if (result.status === 'success') {
 *   console.log('识别结果:', result.text);
 * }
 * ```
 */
export class VolcengineOpenspeechProvider extends BaseOpenspeechProvider {
  /**
   * 云服务商标识：火山引擎 TOS
   * @readonly
   */
  readonly vendor: FileBucketVendor = 'tos';

  /**
   * 构造函数
   *
   * @param {Logger} logger - Winston 日志记录器
   * @param {HttpService} httpService - NestJS HTTP 服务
   * @param {VolcengineAucConfig} config - 火山引擎录音文件识别配置
   * @throws {Error} 配置缺失时抛出异常
   */
  constructor(
    logger: Logger,
    private readonly httpService: HttpService,
    private readonly config: VolcengineAucConfig,
  ) {
    super(logger);

    if (!config) {
      throw new Error('Volcengine OpenSpeech config is required');
    }
  }

  /**
   * 从音频 URL 中提取文件格式
   *
   * @private
   * @param {string} audioUrl - 音频文件 URL
   * @returns {string} 音频格式（默认 mp3）
   *
   * @example
   * ```typescript
   * extractAudioFormat('https://example.com/audio.wav?token=xxx')
   * // 返回: 'wav'
   * ```
   */
  private extractAudioFormat(audioUrl: string): string {
    // 去掉 URL 中的查询参数
    const cleanUrl = audioUrl.split('?')[0];
    const urlLower = cleanUrl.toLowerCase();
    const lastDotIndex = urlLower.lastIndexOf('.');

    if (lastDotIndex !== -1 && lastDotIndex < urlLower.length - 1) {
      const ext = urlLower.substring(lastDotIndex + 1);
      if (SUPPORTED_AUDIO_FORMATS.includes(ext)) {
        return ext;
      }
    }

    // 默认返回 mp3
    return 'mp3';
  }

  /**
   * 构建 API 请求头
   *
   * @private
   * @param {string} requestId - 请求唯一标识
   * @returns {Record<string, string>} HTTP 请求头
   */
  private buildHeaders(requestId: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Api-App-Key': this.config.appId,
      'X-Api-Access-Key': this.config.appAccessToken,
      'X-Api-Request-Id': requestId,
      'X-Api-Sequence': '-1',
      'X-Api-Resource-Id': this.config.resourceId,
    };

    return headers;
  }

  /**
   * 提交语音识别任务到火山引擎
   *
   * @description 调用火山引擎大模型录音文件识别 API 提交任务。
   * 任务提交后，火山引擎会异步处理，可通过回调或轮询获取结果。
   *
   * API 文档：https://www.volcengine.com/docs/6561/1354868
   *
   * @param {SubmitTaskParams} params - 任务提交参数
   * @param {string} params.audioUrl - 音频文件 URL
   * @param {string} [params.callbackUrl] - 回调 URL（可选，默认使用系统配置）
   * @returns {Promise<string>} 火山引擎返回的请求 ID（作为任务 ID）
   * @throws {Error} 配置缺失或 API 调用失败时抛出异常
   *
   * @example
   * ```typescript
   * const taskId = await provider.submitTask({
   *   audioUrl: 'https://bucket.tos-cn-beijing.volces.com/audio.mp3',
   * });
   * console.log('Task ID:', taskId);
   * ```
   */
  async submitTask(params: SubmitTaskParams): Promise<string> {
    const { audioUrl, callbackUrl } = params;

    if (!this.config) {
      throw new Error('Volcengine OpenSpeech config (tos) not found');
    }

    // 校验必要的配置项
    if (!this.config.appId || !this.config.appAccessToken) {
      throw new Error(
        'Volcengine OpenSpeech config missing appId or appAccessToken',
      );
    }

    if (!this.config.uid) {
      throw new Error('Volcengine OpenSpeech config missing uid');
    }

    // 构建 API URL
    const baseEndpoint = this.config.endpoint.replace(/\/+$/, '');
    const submitUrl = `${baseEndpoint}/submit`;

    // 生成唯一请求 ID（用作任务 ID）
    const requestId = uuidv4();

    // 提取音频格式
    const format = this.extractAudioFormat(audioUrl);

    // 构建请求头
    const headers = this.buildHeaders(requestId);

    // 构建回调 URL
    const { api: baseUrl } = environmentUtil.generateEnvironmentUrls();
    const webhookUrl = callbackUrl || `${baseUrl}/webhook/audio-transcribe/tos`;

    try {
      // 构建请求体
      // 文档参考：https://www.volcengine.com/docs/6561/1354868
      const submitBody = {
        user: {
          uid: this.config.uid,
        },
        audio: {
          url: audioUrl,
          format,
        },
        request: {
          model_name: 'bigmodel',
          // 文本规范化（ITN）：如 "一九七零年" -> "1970年"
          enable_itn: true,
          // 标点符号
          enable_punc: true,
          // 语义顺滑
          enable_ddc: true,
          // ⭐ 启用说话人聚类分离（会议场景核心功能）
          enable_speaker_info: true,
          // 语速
          show_speech_rate: true,
          // 音量
          show_volume: true,
          // 情绪检测
          enable_emotion_detection: true,
          // 性别检测
          enable_gender_detection: true,
          // 语义切句
          vad_segment: true,
          // 输出分句信息（含时间戳）
          show_utterances: true,
        },
        callback: webhookUrl,
      };

      this.logInfo('Submitting transcription task', {
        audioUrl,
        format,
        callbackUrl: webhookUrl,
      });

      // 发送请求
      const submitResp = await firstValueFrom(
        this.httpService.post(submitUrl, submitBody, { headers }),
      );

      // 检查响应状态
      const statusCode = submitResp.headers['x-api-status-code'];
      const message = submitResp.headers['x-api-message'];

      if (statusCode && statusCode !== VolcengineStatusCode.SUCCESS) {
        this.logError('Submit task failed', {
          statusCode,
          message,
          data: submitResp.data,
        });
        throw new Error(`Volcengine submit failed: ${statusCode} ${message}`);
      }

      this.logInfo('Task submitted successfully', { requestId });
      return requestId;
    } catch (error) {
      this.logError('Submit task error', {
        audioUrl,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * 查询火山引擎语音识别任务状态
   *
   * @description 调用火山引擎 API 查询任务状态。
   * 状态码说明：
   * - 20000000: 识别成功
   * - 20000001: 正在处理
   * - 20000002: 排队等待中
   * - 其他: 失败
   *
   * @param {string} vendorTaskId - 火山引擎任务 ID（即提交时的 requestId）
   * @returns {Promise<TaskStatusResult>} 任务状态和结果
   *
   * @example
   * ```typescript
   * const result = await provider.queryTaskStatus('uuid-task-id');
   *
   * switch (result.status) {
   *   case 'success':
   *     console.log('识别文本:', result.text);
   *     break;
   *   case 'processing':
   *     console.log('处理中，请稍后重试');
   *     break;
   *   case 'error':
   *     console.error('识别失败:', result.error);
   *     break;
   * }
   * ```
   */
  async queryTaskStatus(vendorTaskId: string): Promise<TaskStatusResult> {
    if (!this.config) {
      throw new Error('Volcengine OpenSpeech config (tos) not found');
    }

    // 校验必要的配置项
    if (!this.config.appId || !this.config.appAccessToken) {
      throw new Error(
        'Volcengine OpenSpeech config missing appId or appAccessToken',
      );
    }

    // 构建 API URL
    const baseEndpoint = this.config.endpoint.replace(/\/+$/, '');
    const queryUrl = `${baseEndpoint}/query`;

    // 构建请求头
    const headers = this.buildHeaders(vendorTaskId);

    try {
      // 发送查询请求
      const queryResp = await firstValueFrom(
        this.httpService.post(queryUrl, {}, { headers }),
      );

      // 获取状态码和消息
      const statusCode =
        queryResp.headers['x-api-status-code'] || queryResp.data?.status_code;
      const message =
        queryResp.headers['x-api-message'] || queryResp.data?.message;

      // 处理成功状态
      if (statusCode === VolcengineStatusCode.SUCCESS) {
        const text =
          queryResp.data?.result?.text || queryResp.data?.result?.[0]?.text;

        this.logInfo('Transcription succeeded', { vendorTaskId });
        return {
          status: 'success',
          text: text || '',
        };
      }

      // 处理处理中状态
      if (
        statusCode === VolcengineStatusCode.PROCESSING ||
        statusCode === VolcengineStatusCode.QUEUEING
      ) {
        return {
          status: 'processing',
        };
      }

      // 其他状态视为失败
      this.logError('Transcription failed', {
        vendorTaskId,
        statusCode,
        message,
        data: queryResp.data,
      });
      return {
        status: 'error',
        error: `Volcengine transcription failed: ${statusCode} ${message}`,
      };
    } catch (error) {
      this.logError('Query task status error', {
        vendorTaskId,
        error: (error as Error).message,
      });
      return {
        status: 'error',
        error: (error as Error).message,
      };
    }
  }
}
