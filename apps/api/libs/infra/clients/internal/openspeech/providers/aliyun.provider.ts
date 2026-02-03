/**
 * @fileoverview 阿里云 OpenSpeech 语音识别服务提供商
 *
 * 本文件实现了阿里云 NLS（自然语言服务）的录音文件识别功能。
 * 阿里云语音识别服务文档：https://help.aliyun.com/document_detail/90727.html
 *
 * @module openspeech/providers/aliyun
 */

import { Logger } from 'winston';
import { FileBucketVendor } from '@prisma/client';
import { BaseOpenspeechProvider } from './base.provider';
import {
  SubmitTaskParams,
  TaskStatusResult,
  AliyunOpenspeechConfig,
} from '../types';
import environmentUtil from '@/utils/enviroment.util';

/**
 * 阿里云语音识别服务提供商
 *
 * @description 封装了阿里云 NLS 录音文件识别的核心功能：
 * - 任务提交：将音频文件提交到阿里云进行语音识别
 * - 状态查询：查询识别任务的处理状态和结果
 *
 * 主要特性：
 * - 支持智能分轨（双声道对话场景）
 * - 支持语义句子检测
 * - 支持时间戳对齐
 * - 支持回调通知
 *
 * @class AliyunOpenspeechProvider
 * @extends {BaseOpenspeechProvider}
 *
 * @example
 * ```typescript
 * const provider = new AliyunOpenspeechProvider(logger, {
 *   accessKeyId: 'your-access-key-id',
 *   accessKeySecret: 'your-access-key-secret',
 *   endpoint: 'https://nls-meta.cn-shanghai.aliyuncs.com',
 *   nslAppKey: 'your-app-key',
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
export class AliyunOpenspeechProvider extends BaseOpenspeechProvider {
  /**
   * 云服务商标识：阿里云 OSS
   * @readonly
   */
  readonly vendor: FileBucketVendor = 'oss';

  /**
   * 构造函数
   *
   * @param {Logger} logger - Winston 日志记录器
   * @param {AliyunOpenspeechConfig} config - 阿里云配置
   * @throws {Error} 配置缺失时抛出异常
   */
  constructor(
    logger: Logger,
    private readonly config: AliyunOpenspeechConfig,
  ) {
    super(logger);

    if (!config) {
      throw new Error('Aliyun OpenSpeech config is required');
    }
  }

  /**
   * 提交语音识别任务到阿里云
   *
   * @description 调用阿里云 NLS API 提交录音文件识别任务。
   * 任务提交后，阿里云会异步处理，可通过回调或轮询获取结果。
   *
   * 任务配置说明：
   * - auto_split: 开启智能分轨，适用于双方对话场景
   * - enable_semantic_sentence_detection: 开启语义句子检测
   * - enable_timestamp_alignment: 开启时间戳对齐
   * - enable_callback: 开启回调通知
   *
   * @param {SubmitTaskParams} params - 任务提交参数
   * @param {string} params.audioUrl - 音频文件 URL
   * @param {string} [params.callbackUrl] - 回调 URL（可选，默认使用系统配置）
   * @returns {Promise<string>} 阿里云返回的任务 ID (TaskId)
   * @throws {Error} 配置缺失或 API 调用失败时抛出异常
   *
   * @example
   * ```typescript
   * const taskId = await provider.submitTask({
   *   audioUrl: 'https://bucket.oss-cn-hangzhou.aliyuncs.com/audio.mp3',
   * });
   * console.log('Task ID:', taskId);
   * ```
   */
  async submitTask(params: SubmitTaskParams): Promise<string> {
    const { audioUrl, callbackUrl } = params;

    if (!this.config) {
      throw new Error('Aliyun OpenSpeech config (oss) not found');
    }

    // 校验必要的配置项
    if (!this.config.accessKeyId || !this.config.accessKeySecret) {
      throw new Error(
        'Aliyun OpenSpeech config missing accessKeyId or accessKeySecret',
      );
    }

    if (!this.config.nslAppKey) {
      throw new Error('Aliyun OpenSpeech config missing nslAppKey');
    }

    // 动态引入阿里云 NLS SDK
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NlsClient = require('@alicloud/nls-filetrans-2018-08-17');

    try {
      // 创建 NLS 客户端实例
      const nlsClient = new NlsClient({
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        endpoint: this.config.endpoint,
        apiVersion: this.config.apiVersion || '2018-08-17',
      });

      // 构建回调 URL
      const webhookUrl =
        callbackUrl ||
        `${environmentUtil.generateEnvironmentUrls().api}/webhook/audio-transcribe/oss`;

      // 构建任务参数
      // 详细参数说明参考：https://help.aliyun.com/document_detail/90727.html
      const task = {
        // 应用 AppKey
        app_key: this.config.nslAppKey,
        // 音频文件链接
        file_link: audioUrl,
        // API 版本，4.0 支持更多功能
        version: '4.0',
        // 是否返回词级别时间戳
        enable_words: false,
        // 是否开启回调
        enable_callback: true,
        // 是否开启采样率自适应
        enable_sample_rate_adaptive: true,
        // 回调地址
        callback_url: webhookUrl,
        // 智能分轨：双声道对话场景下，根据 ChannelId 判断发言人
        auto_split: true,
        // 语气词过滤（声音顺滑）
        enable_disfluency: false,
        // 语义句子检测：识别句子中的语义信息
        enable_semantic_sentence_detection: true,
        // 时间戳对齐：识别句子中的时间戳信息
        enable_timestamp_alignment: true,
      };

      const taskParams = {
        Task: JSON.stringify(task),
      };

      const options = {
        method: 'POST',
      };

      this.logInfo('Submitting transcription task', {
        audioUrl,
        callbackUrl: webhookUrl,
      });

      // 提交任务
      const submitResp = await nlsClient.submitTask(taskParams, options);
      const taskId = submitResp?.TaskId;

      if (!taskId) {
        this.logError('Submit task failed: TaskId missing', {
          response: submitResp,
        });
        throw new Error('Aliyun submitTask failed: TaskId missing');
      }

      this.logInfo('Task submitted successfully', { taskId });
      return taskId;
    } catch (error) {
      this.logError('Submit task error', {
        audioUrl,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * 查询阿里云语音识别任务状态
   *
   * @description 调用阿里云 NLS API 查询任务状态。
   * 任务状态包括：
   * - SUCCESS: 识别成功，返回识别文本
   * - RUNNING: 正在处理中
   * - QUEUEING: 排队等待中
   * - FAIL: 识别失败
   * - EXPIRED: 任务过期
   *
   * @param {string} vendorTaskId - 阿里云任务 ID
   * @returns {Promise<TaskStatusResult>} 任务状态和结果
   *
   * @example
   * ```typescript
   * const result = await provider.queryTaskStatus('task-123456');
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
      throw new Error('Aliyun OpenSpeech config (oss) not found');
    }

    // 校验必要的配置项
    if (!this.config.accessKeyId || !this.config.accessKeySecret) {
      throw new Error(
        'Aliyun OpenSpeech config missing accessKeyId or accessKeySecret',
      );
    }

    // 动态引入阿里云 NLS SDK
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NlsClient = require('@alicloud/nls-filetrans-2018-08-17');

    try {
      const nlsClient = new NlsClient({
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        endpoint: this.config.endpoint,
        apiVersion: this.config.apiVersion || '2018-08-17',
      });

      // 查询任务结果
      const resultResp = await nlsClient.getTaskResult({
        TaskId: vendorTaskId,
      });
      const status = resultResp?.StatusText;

      // 处理成功状态
      if (status === 'SUCCESS') {
        const text = resultResp?.Result;
        const textStr =
          typeof text === 'string' ? text : JSON.stringify(text || '');

        this.logInfo('Transcription succeeded', { vendorTaskId });
        return {
          status: 'success',
          text: textStr,
        };
      }

      // 处理失败状态
      if (status === 'FAIL' || status === 'EXPIRED') {
        this.logError('Transcription failed', {
          vendorTaskId,
          status,
          response: resultResp,
        });
        return {
          status: 'error',
          error: `Aliyun transcription failed, status=${status}`,
        };
      }

      // 其他状态（RUNNING, QUEUEING 等）视为处理中
      return {
        status: 'processing',
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
