/**
 * @fileoverview OpenSpeech 语音识别服务类型定义
 *
 * 本文件定义了语音识别服务的核心接口和类型，用于统一阿里云和火山引擎等
 * 不同云服务商的语音识别能力。
 *
 * @module openspeech/types
 */

import { FileBucketVendor } from '@prisma/client';

/**
 * 语音识别任务状态枚举
 *
 * @description 定义了语音识别任务的三种状态
 */
export type TranscribeTaskStatus = 'processing' | 'success' | 'error';

/**
 * 语音识别任务提交参数
 *
 * @interface SubmitTaskParams
 * @property {string} audioUrl - 音频文件的 HTTP(S) URL 地址
 * @property {string} [callbackUrl] - 可选的回调通知 URL
 */
export interface SubmitTaskParams {
  /** 音频文件的 HTTP(S) URL 地址 */
  audioUrl: string;
  /** 回调通知 URL（任务完成后平台会回调此地址） */
  callbackUrl?: string;
}

/**
 * 语音识别任务提交结果
 *
 * @interface SubmitTaskResult
 * @property {FileBucketVendor} vendor - 云服务商标识（oss=阿里云, tos=火山引擎）
 * @property {string} vendorTaskId - 云服务商返回的任务唯一标识
 * @property {string} audioUrl - 提交的音频 URL
 */
export interface SubmitTaskResult {
  /** 云服务商标识 */
  vendor: FileBucketVendor;
  /** 云服务商返回的任务 ID */
  vendorTaskId: string;
  /** 音频文件 URL */
  audioUrl: string;
}

/**
 * 语音识别任务状态查询结果
 *
 * @interface TaskStatusResult
 * @property {TranscribeTaskStatus} status - 任务当前状态
 * @property {string} [text] - 识别成功时的文本结果
 * @property {string} [error] - 识别失败时的错误信息
 */
export interface TaskStatusResult {
  /** 任务状态 */
  status: TranscribeTaskStatus;
  /** 识别出的文本内容（仅 status='success' 时有值） */
  text?: string;
  /** 错误信息（仅 status='error' 时有值） */
  error?: string;
}

/**
 * 语音识别服务提供商接口
 *
 * @description 定义了语音识别服务提供商必须实现的核心方法，
 * 所有云服务商的实现类都必须遵循此接口。
 *
 * @interface IOpenspeechProvider
 *
 * @example
 * ```typescript
 * class AliyunProvider implements IOpenspeechProvider {
 *   readonly vendor = 'oss';
 *
 *   async submitTask(params: SubmitTaskParams): Promise<string> {
 *     // 提交任务到阿里云
 *   }
 *
 *   async queryTaskStatus(vendorTaskId: string): Promise<TaskStatusResult> {
 *     // 查询阿里云任务状态
 *   }
 * }
 * ```
 */
export interface IOpenspeechProvider {
  /**
   * 云服务商标识
   * - 'oss': 阿里云
   * - 'tos': 火山引擎
   */
  readonly vendor: FileBucketVendor;

  /**
   * 提交语音识别任务
   *
   * @param {SubmitTaskParams} params - 任务提交参数
   * @returns {Promise<string>} 返回云服务商的任务 ID
   * @throws {Error} 配置缺失或提交失败时抛出异常
   */
  submitTask(params: SubmitTaskParams): Promise<string>;

  /**
   * 查询语音识别任务状态
   *
   * @param {string} vendorTaskId - 云服务商的任务 ID
   * @returns {Promise<TaskStatusResult>} 返回任务状态和结果
   */
  queryTaskStatus(vendorTaskId: string): Promise<TaskStatusResult>;
}

/**
 * 阿里云 OpenSpeech 配置
 *
 * @description 与 keys.validation.ts 中的 openspeechProviderSchema 保持一致
 * @interface AliyunOpenspeechConfig
 */
export interface AliyunOpenspeechConfig {
  /** AccessKey ID */
  accessKeyId?: string;
  /** AccessKey Secret */
  accessKeySecret?: string;
  /** API 端点地址 */
  endpoint: string;
  /** NLS 应用 AppKey */
  nslAppKey?: string;
  /** Token 端点（可选） */
  tokenEndpoint?: string;
  /** Access Key（备用字段） */
  accessKey?: string;
  /** Secret Key（备用字段） */
  secretKey?: string;
  /** NLS 应用 ID（可选） */
  nslAppId?: string;
  /** API 版本（可选） */
  apiVersion?: string;
}

/**
 * 火山引擎语音识别模式配置
 *
 * @interface VolcengineAsrModeConfig
 */
export interface VolcengineAsrModeConfig {
  /** API/WebSocket 端点地址 */
  endpoint: string;
  /** 资源 ID */
  resourceId: string;
}

/**
 * 火山引擎 OpenSpeech 配置（新结构）
 *
 * @description 与 keys.validation.ts 中的 openspeechVolcengineProviderSchema 保持一致
 * @interface VolcengineOpenspeechConfig
 */
export interface VolcengineOpenspeechConfig {
  /** 应用 ID */
  appId: string;
  /** 应用访问令牌 */
  appAccessToken: string;
  /** 用户 ID */
  uid: string;
  /** 应用访问密钥（可选） */
  appAccessSecret?: string;
  /** Access Key（用于签名，可选） */
  accessKey?: string;
  /** Secret Key（用于签名，可选） */
  secretKey?: string;
  /** 录音文件识别配置（AUC = Async Upload & Callback） */
  auc?: VolcengineAsrModeConfig;
  /** 流式语音识别配置（SAUC = Streaming Async Upload & Callback） */
  sauc?: VolcengineAsrModeConfig;
}

/**
 * 火山引擎录音文件识别配置（用于 Provider）
 *
 * @description 从 VolcengineOpenspeechConfig 提取的录音文件识别专用配置
 * @interface VolcengineAucConfig
 */
export interface VolcengineAucConfig {
  /** 应用 ID */
  appId: string;
  /** 应用访问令牌 */
  appAccessToken: string;
  /** 用户 ID */
  uid: string;
  /** API 端点地址 */
  endpoint: string;
  /** 资源 ID */
  resourceId: string;
  /** 应用访问密钥（可选） */
  appAccessSecret?: string;
  /** Access Key（用于签名，可选） */
  accessKey?: string;
  /** Secret Key（用于签名，可选） */
  secretKey?: string;
}

/**
 * 火山引擎流式语音识别配置（用于 Provider）
 *
 * @description 从 VolcengineOpenspeechConfig 提取的流式识别专用配置
 * @interface VolcengineSaucConfig
 */
export interface VolcengineSaucConfig {
  /** 应用 ID */
  appId: string;
  /** 应用访问令牌 */
  appAccessToken: string;
  /** 用户 ID */
  uid: string;
  /** WebSocket 端点地址 */
  endpoint: string;
  /** 资源 ID */
  resourceId: string;
  /** 应用访问密钥（可选） */
  appAccessSecret?: string;
  /** Access Key（用于签名，可选） */
  accessKey?: string;
  /** Secret Key（用于签名，可选） */
  secretKey?: string;
}

// ============================================================================
// 流式语音识别类型定义（Phase 2）
// ============================================================================

/**
 * 流式语音识别状态
 */
export type StreamingAsrStatus =
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'disconnected';

/**
 * 支持的语言代码
 * @see https://www.volcengine.com/docs/6561/1354869
 */
export type StreamingAsrLanguage =
  | '' // 中英文混合（默认）
  | 'en-US' // 英语
  | 'ja-JP' // 日语
  | 'ko-KR' // 韩语
  | 'id-ID' // 印尼语
  | 'es-MX' // 西班牙语
  | 'pt-BR' // 葡萄牙语
  | 'de-DE' // 德语
  | 'fr-FR' // 法语
  | 'fil-PH' // 菲律宾语
  | 'ms-MY' // 马来语
  | 'th-TH' // 泰语
  | 'ar-SA'; // 阿拉伯语

/**
 * 热词配置
 */
export interface StreamingAsrHotword {
  /** 热词文本 */
  word: string;
  /** 热词权重因子（1.0-10.0） */
  factor: number;
}

/**
 * 语料/干预词配置
 */
export interface StreamingAsrCorpusConfig {
  /** 自学习平台上设置的热词词表名称 */
  boostingTableName?: string;
  /** 自学习平台上设置的热词词表 ID */
  boostingTableId?: string;
  /** 自学习平台上设置的替换词词表名称 */
  correctTableName?: string;
  /** 自学习平台上设置的替换词词表 ID */
  correctTableId?: string;
  /** 热词直传（优先级高于传热词表） */
  hotwords?: StreamingAsrHotword[];
}

/**
 * 流式识别会话连接参数
 */
export interface StreamingConnectParams {
  /** 会话 ID */
  sessionId: string;
  /** 音频格式（默认 pcm） */
  audioFormat?: 'pcm' | 'wav' | 'ogg' | 'opus';
  /** 采样率（默认 16000） */
  sampleRate?: number;
  /** 声道数（默认 1） */
  channels?: number;
  /** 是否启用说话人分离 */
  enableSpeakerInfo?: boolean;

  // ========== 新增参数 ==========

  /** 指定可识别的语言 */
  language?: StreamingAsrLanguage;
  /** 启用ITN（文本规范化），如"一九七零年"->"1970年"（默认 true） */
  enableItn?: boolean;
  /** 启用标点（默认 true） */
  enablePunc?: boolean;
  /** 启用语义顺滑（默认 false） */
  enableDdc?: boolean;
  /**
   * 开启流式+非流式二遍识别模式（仅双向流式优化版支持）
   * 二遍识别可以获得更高的准确率
   */
  enableNonstream?: boolean;
  /** 输出语音停顿、分句、分词信息（默认 false，建议开启） */
  showUtterances?: boolean;
  /** 分句信息携带语速（仅 nostream 接口和双向流式优化版支持） */
  showSpeechRate?: boolean;
  /** 分句信息携带音量（仅 nostream 接口和双向流式优化版支持） */
  showVolume?: boolean;
  /** 启用语种检测（仅 nostream 接口和双向流式优化版支持） */
  enableLid?: boolean;
  /** 启用情绪检测（仅 nostream 接口和双向流式优化版支持） */
  enableEmotionDetection?: boolean;
  /** 启用性别检测（仅 nostream 接口和双向流式优化版支持） */
  enableGenderDetection?: boolean;
  /** 结果返回方式：full(全量) / single(增量)，默认 full */
  resultType?: 'full' | 'single';
  /** 是否启动首字返回加速 */
  enableAccelerateText?: boolean;
  /** 首字返回加速率，配合 enableAccelerateText 使用 */
  accelerateScore?: number;
  /** 语义切句的最大静音阈值(ms)，当静音时间超过该值时进行切句（默认 3000） */
  vadSegmentDuration?: number;
  /** 强制判停时间(ms)，最小 200（默认 800） */
  endWindowSize?: number;
  /** 强制语音时间(ms)，最小 1（默认 10000） */
  forceToSpeechTime?: number;
  /** 敏感词过滤功能配置 */
  sensitiveWordsFilter?: string;
  /** 语料/干预词配置 */
  corpus?: StreamingAsrCorpusConfig;
}

/**
 * 分词信息
 */
export interface StreamingWord {
  /** 单字/词文本 */
  text: string;
  /** 起始时间（毫秒） */
  startTime: number;
  /** 结束时间（毫秒） */
  endTime: number;
  /** 空白时长 */
  blankDuration?: number;
}

/**
 * 流式识别单个说话片段
 */
export interface StreamingUtterance {
  /** 说话人 ID */
  speakerId: string;
  /** 识别文本 */
  text: string;
  /** 开始时间（毫秒） */
  startTime: number;
  /** 结束时间（毫秒） */
  endTime: number;
  /** 是否确定（非中间结果） */
  definite?: boolean;
  /** 语速 */
  speechRate?: number;
  /** 音量 */
  volume?: number;
  /** 情绪 */
  emotion?: string;
  /** 性别 */
  gender?: string;
  /** 检测到的语种 */
  language?: string;
  /** 分词信息列表 */
  words?: StreamingWord[];
}

/**
 * 流式识别结果
 */
export interface StreamingAsrResult {
  /** 识别文本（当前片段） */
  text: string;
  /** 是否为最终结果 */
  isFinal: boolean;
  /** 说话人分离数据 */
  utterances?: StreamingUtterance[];
  /** 错误信息 */
  error?: string;
  /** 序列号 */
  sequence?: number;
  /** 音频时长（毫秒） */
  audioDuration?: number;
  /** 火山引擎错误码（用于区分具体错误类型） */
  errorCode?: number;
}

/**
 * 流式识别事件回调
 */
export interface StreamingAsrCallbacks {
  /** 收到识别结果 */
  onResult?: (result: StreamingAsrResult) => void;
  /** 连接建立 */
  onConnected?: () => void;
  /** 连接关闭 */
  onDisconnected?: () => void;
  /** 发生错误 */
  onError?: (error: Error) => void;
}

/**
 * 流式语音识别服务提供商接口
 */
export interface IStreamingAsrProvider {
  /** 云服务商标识 */
  readonly vendor: string;

  /**
   * 建立流式识别连接
   * @param params 连接参数
   * @param callbacks 事件回调
   * @returns WebSocket 连接实例或连接 ID
   */
  connect(
    params: StreamingConnectParams,
    callbacks: StreamingAsrCallbacks,
  ): Promise<string>;

  /**
   * 发送音频数据
   * @param connectionId 连接 ID
   * @param audioData 音频数据（Buffer）
   * @param isLast 是否为最后一帧
   */
  sendAudio(
    connectionId: string,
    audioData: Buffer,
    isLast?: boolean,
  ): Promise<void>;

  /**
   * 关闭连接
   * @param connectionId 连接 ID
   */
  disconnect(connectionId: string): Promise<void>;

  /**
   * 获取连接状态
   * @param connectionId 连接 ID
   */
  getConnectionStatus(connectionId: string): StreamingAsrStatus;
}
