/**
 * @fileoverview 火山引擎流式语音识别 Provider
 *
 * 本文件实现了火山引擎大模型流式语音识别功能，支持实时音频流转写。
 * 火山引擎流式语音识别文档：https://www.volcengine.com/docs/6561/1354869
 *
 * 支持的模式：
 * - 双向流式模式（优化版本）：wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async
 *   推荐使用，只有结果变化时才返回新数据包，性能更优
 *
 * @module openspeech/providers/volcengine-streaming
 */

import { Logger } from 'winston';
import WebSocket from 'ws';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import {
  VolcengineSaucConfig,
  IStreamingAsrProvider,
  StreamingConnectParams,
  StreamingAsrCallbacks,
  StreamingAsrResult,
  StreamingAsrStatus,
  StreamingUtterance,
  StreamingWord,
} from '../types';

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

/**
 * 消息类型常量
 * @description 定义 WebSocket 二进制协议中的消息类型
 */
const MESSAGE_TYPE = {
  /** 端上发送包含请求参数的 full client request */
  FULL_CLIENT_REQUEST: 0b0001,
  /** 端上发送包含音频数据的 audio only request */
  AUDIO_ONLY_CLIENT_REQUEST: 0b0010,
  /** 服务端下发包含识别结果的 full server response */
  FULL_SERVER_RESPONSE: 0b1001,
  /** 服务端处理错误时下发的消息类型 */
  ERROR_RESPONSE: 0b1111,
} as const;

/**
 * 消息类型特定标志
 */
const MESSAGE_FLAGS = {
  /** header后4个字节不为sequence number */
  NO_SEQUENCE: 0b0000,
  /** header后4个字节为sequence number且为正 */
  POSITIVE_SEQUENCE: 0b0001,
  /** header后4个字节不为sequence number，仅指示此为最后一包（负包） */
  LAST_PACKET_NO_SEQ: 0b0010,
  /** header后4个字节为sequence number且需要为负数（最后一包/负包） */
  LAST_PACKET_WITH_SEQ: 0b0011,
} as const;

/**
 * 序列化方法常量
 */
const SERIALIZATION = {
  /** 无序列化 */
  NONE: 0b0000,
  /** JSON 格式 */
  JSON: 0b0001,
} as const;

/**
 * 压缩方法常量
 */
const COMPRESSION = {
  /** 无压缩 */
  NONE: 0b0000,
  /** Gzip 压缩 */
  GZIP: 0b0001,
} as const;

/**
 * 火山引擎 ASR 错误码
 * @see https://www.volcengine.com/docs/6561/1354869
 */
const VOLCENGINE_ERROR_CODES = {
  /** 成功 */
  SUCCESS: 20000000,
  /** 请求参数无效（缺失必需字段/字段值无效/重复请求） */
  INVALID_PARAMS: 45000001,
  /** 空音频 */
  EMPTY_AUDIO: 45000002,
  /** 等包超时 */
  PACKET_TIMEOUT: 45000081,
  /** 音频格式不正确 */
  INVALID_AUDIO_FORMAT: 45000151,
  /** 服务器繁忙（服务过载） */
  SERVER_BUSY: 55000031,
} as const;

/**
 * 错误码到中文描述的映射
 */
const ERROR_CODE_MESSAGES: Record<number, string> = {
  [VOLCENGINE_ERROR_CODES.SUCCESS]: '成功',
  [VOLCENGINE_ERROR_CODES.INVALID_PARAMS]:
    '请求参数无效：缺失必需字段、字段值无效或重复请求',
  [VOLCENGINE_ERROR_CODES.EMPTY_AUDIO]: '空音频：未收到有效的音频数据',
  [VOLCENGINE_ERROR_CODES.PACKET_TIMEOUT]: '等包超时：音频发送间隔过长',
  [VOLCENGINE_ERROR_CODES.INVALID_AUDIO_FORMAT]:
    '音频格式不正确：请检查音频编码格式',
  [VOLCENGINE_ERROR_CODES.SERVER_BUSY]: '服务器繁忙：服务过载，请稍后重试',
};

/**
 * 推荐的音频包大小（毫秒）
 * 文档建议 100-200ms，双向流式模式推荐 200ms
 */
const RECOMMENDED_AUDIO_PACKET_MS = {
  MIN: 100,
  MAX: 200,
  OPTIMAL: 200,
} as const;

/**
 * 重连配置接口
 */
interface ReconnectConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始重试延迟（毫秒） */
  initialDelay: number;
  /** 最大重试延迟（毫秒） */
  maxDelay: number;
  /** 延迟增长因子 */
  backoffMultiplier: number;
}

/**
 * 默认重连配置
 */
const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * 心跳配置
 */
const HEARTBEAT_CONFIG = {
  /** 心跳间隔（毫秒） */
  interval: 25000,
  /** 心跳超时（毫秒） */
  timeout: 10000,
};

/**
 * 连接信息接口
 */
interface ConnectionInfo {
  ws: WebSocket;
  status: StreamingAsrStatus;
  callbacks: StreamingAsrCallbacks;
  sessionId: string;
  sequence: number;
  transcript: string;
  utterances: StreamingUtterance[];
  /** 连接参数（用于重连） */
  connectParams: StreamingConnectParams;
  /** 重试次数 */
  retryCount: number;
  /** 心跳定时器 */
  heartbeatTimer?: NodeJS.Timeout;
  /** 心跳超时定时器 */
  heartbeatTimeoutTimer?: NodeJS.Timeout;
  /** 上次活动时间 */
  lastActivityTime: number;
  /** 是否正在重连 */
  isReconnecting: boolean;
  /** 待发送的音频缓冲（重连时使用） */
  pendingAudioBuffer: Buffer[];
}

/**
 * 火山引擎流式语音识别 Provider
 *
 * @description 封装了火山引擎大模型流式语音识别的核心功能：
 * - WebSocket 连接管理
 * - 二进制协议编解码
 * - 音频数据分包发送
 * - 实时识别结果解析
 *
 * @class VolcengineStreamingAsrProvider
 * @implements {IStreamingAsrProvider}
 *
 * @example
 * ```typescript
 * const provider = new VolcengineStreamingAsrProvider(logger, config);
 *
 * // 建立连接
 * const connectionId = await provider.connect(
 *   { sessionId: 'session-123', audioFormat: 'pcm' },
 *   {
 *     onResult: (result) => console.log('识别结果:', result.text),
 *     onConnected: () => console.log('已连接'),
 *     onError: (error) => console.error('错误:', error),
 *   }
 * );
 *
 * // 发送音频数据
 * await provider.sendAudio(connectionId, audioBuffer);
 *
 * // 发送最后一帧
 * await provider.sendAudio(connectionId, lastAudioBuffer, true);
 *
 * // 关闭连接
 * await provider.disconnect(connectionId);
 * ```
 */
export class VolcengineStreamingAsrProvider implements IStreamingAsrProvider {
  /**
   * 云服务商标识
   */
  readonly vendor = 'volcengine-streaming';

  /**
   * 连接池
   * @description 存储所有活跃的 WebSocket 连接
   */
  private readonly connections: Map<string, ConnectionInfo> = new Map();

  /**
   * 重连配置
   */
  private readonly reconnectConfig: ReconnectConfig;

  /**
   * 构造函数
   *
   * @param {Logger} logger - Winston 日志记录器
   * @param {VolcengineSaucConfig} config - 火山引擎流式语音识别配置
   * @param {Partial<ReconnectConfig>} reconnectConfig - 重连配置（可选）
   */
  constructor(
    private readonly logger: Logger,
    private readonly config: VolcengineSaucConfig,
    reconnectConfig?: Partial<ReconnectConfig>,
  ) {
    if (!config) {
      throw new Error('Volcengine Streaming ASR config is required');
    }
    this.reconnectConfig = {
      ...DEFAULT_RECONNECT_CONFIG,
      ...reconnectConfig,
    };
  }

  /**
   * 记录信息日志
   */
  private logInfo(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(`[volcengine-streaming] ${message}`, meta);
  }

  /**
   * 记录错误日志
   */
  private logError(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(`[volcengine-streaming] ${message}`, meta);
  }

  /**
   * 记录警告日志
   */
  private logWarn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(`[volcengine-streaming] ${message}`, meta);
  }

  /**
   * 记录调试日志
   */
  private logDebug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(`[volcengine-streaming] ${message}`, meta);
  }

  /**
   * 构建 WebSocket 连接认证头
   *
   * @param connectId - 连接唯一标识
   * @returns HTTP 请求头
   */
  private buildHeaders(connectId: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Api-App-Key': this.config.appId!,
      'X-Api-Access-Key': this.config.appAccessToken!,
      'X-Api-Connect-Id': connectId,
    };

    // 可选的资源 ID
    if (this.config.resourceId) {
      headers['X-Api-Resource-Id'] = this.config.resourceId;
    }

    return headers;
  }

  /**
   * 构建消息头（4 bytes）
   *
   * @description 按照火山引擎 WebSocket 二进制协议构建消息头
   *
   * 协议格式：
   * - Byte 0: Version (4 bits) + Header Size (4 bits)
   * - Byte 1: Message Type (4 bits) + Message Type Specific Flags (4 bits)
   * - Byte 2: Serialization Method (4 bits) + Compression (4 bits)
   * - Byte 3: Reserved
   *
   * @param messageType - 消息类型
   * @param specificFlags - 消息类型特定标志
   * @param serialization - 序列化方法
   * @param compression - 压缩方法
   * @returns 4 字节的消息头 Buffer
   */
  private buildMessageHeader(
    messageType: number,
    specificFlags: number = MESSAGE_FLAGS.NO_SEQUENCE,
    serialization: number = SERIALIZATION.JSON,
    compression: number = COMPRESSION.GZIP,
  ): Buffer {
    const header = Buffer.alloc(4);
    // Byte 0: Version (0b0001) + Header Size (0b0001 = 4 bytes)
    header[0] = (0b0001 << 4) | 0b0001;
    // Byte 1: Message Type + Specific Flags
    header[1] = (messageType << 4) | specificFlags;
    // Byte 2: Serialization + Compression
    header[2] = (serialization << 4) | compression;
    // Byte 3: Reserved
    header[3] = 0x00;
    return header;
  }

  /**
   * 构建完整客户端请求消息（初始请求）
   *
   * @param data - 请求参数（JSON 对象）
   * @returns 完整的二进制消息
   */
  private async buildFullClientRequest(data: object): Promise<Buffer> {
    const header = this.buildMessageHeader(
      MESSAGE_TYPE.FULL_CLIENT_REQUEST,
      MESSAGE_FLAGS.NO_SEQUENCE,
      SERIALIZATION.JSON,
      COMPRESSION.GZIP,
    );

    const jsonData = JSON.stringify(data);
    const compressed = await gzipAsync(Buffer.from(jsonData, 'utf-8'));

    // Payload size (4 bytes, big-endian)
    const payloadSize = Buffer.alloc(4);
    payloadSize.writeUInt32BE(compressed.length, 0);

    return Buffer.concat([header, payloadSize, compressed]);
  }

  /**
   * 构建音频数据请求消息
   *
   * @param audioData - 音频数据
   * @param isLast - 是否为最后一帧
   * @returns 完整的二进制消息
   */
  private async buildAudioOnlyRequest(
    audioData: Buffer,
    isLast: boolean = false,
  ): Promise<Buffer> {
    const specificFlags = isLast
      ? MESSAGE_FLAGS.LAST_PACKET_NO_SEQ
      : MESSAGE_FLAGS.NO_SEQUENCE;

    const header = this.buildMessageHeader(
      MESSAGE_TYPE.AUDIO_ONLY_CLIENT_REQUEST,
      specificFlags,
      SERIALIZATION.NONE, // 音频数据不序列化
      COMPRESSION.GZIP,
    );

    const compressed = await gzipAsync(audioData);

    // Payload size (4 bytes, big-endian)
    const payloadSize = Buffer.alloc(4);
    payloadSize.writeUInt32BE(compressed.length, 0);

    return Buffer.concat([header, payloadSize, compressed]);
  }

  /**
   * 构建初始请求参数对象
   *
   * @description 根据连接参数构建符合火山引擎 API 规范的初始请求
   * @param options - 连接参数选项
   * @returns 初始请求对象
   */
  private buildInitRequest(options: {
    audioFormat: string;
    sampleRate: number;
    channels: number;
    enableSpeakerInfo: boolean;
    language?: string;
    enableItn: boolean;
    enablePunc: boolean;
    enableDdc: boolean;
    enableNonstream: boolean;
    showUtterances: boolean;
    showSpeechRate: boolean;
    showVolume: boolean;
    enableLid: boolean;
    enableEmotionDetection: boolean;
    enableGenderDetection: boolean;
    resultType: string;
    enableAccelerateText: boolean;
    accelerateScore?: number;
    vadSegmentDuration?: number;
    endWindowSize?: number;
    forceToSpeechTime?: number;
    sensitiveWordsFilter?: string;
    corpus?: {
      boostingTableName?: string;
      boostingTableId?: string;
      correctTableName?: string;
      correctTableId?: string;
      hotwords?: Array<{ word: string; factor: number }>;
    };
  }): Record<string, unknown> {
    const {
      audioFormat,
      sampleRate,
      channels,
      enableSpeakerInfo,
      language,
      enableItn,
      enablePunc,
      enableDdc,
      enableNonstream,
      showUtterances,
      showSpeechRate,
      showVolume,
      enableLid,
      enableEmotionDetection,
      enableGenderDetection,
      resultType,
      enableAccelerateText,
      accelerateScore,
      vadSegmentDuration,
      endWindowSize,
      forceToSpeechTime,
      sensitiveWordsFilter,
      corpus,
    } = options;

    // 构建 audio 配置
    const audio: Record<string, unknown> = {
      format: audioFormat,
      rate: sampleRate,
      bits: 16,
      channel: channels,
    };

    // 如果指定了语言，添加 language 字段
    if (language) {
      audio.language = language;
    }

    // 构建 request 配置
    const request: Record<string, unknown> = {
      model_name: 'bigmodel',
      enable_itn: enableItn,
      enable_punc: enablePunc,
      enable_ddc: enableDdc,
      enable_nonstream: enableNonstream,
      show_utterances: showUtterances,
      show_speech_rate: showSpeechRate,
      show_volume: showVolume,
      enable_lid: enableLid,
      enable_emotion_detection: enableEmotionDetection,
      enable_gender_detection: enableGenderDetection,
      enable_speaker_info: enableSpeakerInfo,
      result_type: resultType,
      enable_accelerate_text: enableAccelerateText,
    };

    // 可选参数
    if (accelerateScore !== undefined) {
      request.accelerate_score = accelerateScore;
    }
    if (vadSegmentDuration !== undefined) {
      request.vad_segment_duration = vadSegmentDuration;
    }
    if (endWindowSize !== undefined) {
      request.end_window_size = endWindowSize;
    }
    if (forceToSpeechTime !== undefined) {
      request.force_to_speech_time = forceToSpeechTime;
    }
    if (sensitiveWordsFilter) {
      request.sensitive_words_filter = sensitiveWordsFilter;
    }

    // 构建 corpus 配置（热词/干预词）
    if (corpus) {
      const corpusConfig: Record<string, unknown> = {};

      if (corpus.boostingTableName) {
        corpusConfig.boosting_table_name = corpus.boostingTableName;
      }
      if (corpus.boostingTableId) {
        corpusConfig.boosting_table_id = corpus.boostingTableId;
      }
      if (corpus.correctTableName) {
        corpusConfig.correct_table_name = corpus.correctTableName;
      }
      if (corpus.correctTableId) {
        corpusConfig.correct_table_id = corpus.correctTableId;
      }

      // 热词直传
      if (corpus.hotwords && corpus.hotwords.length > 0) {
        corpusConfig.context = JSON.stringify({
          hotwords: corpus.hotwords,
        });
      }

      if (Object.keys(corpusConfig).length > 0) {
        request.corpus = corpusConfig;
      }
    }

    return {
      user: {
        uid: this.config.uid,
      },
      audio,
      request,
    };
  }

  /**
   * 解析服务器响应
   *
   * @param data - 原始二进制响应数据
   * @returns 解析后的识别结果
   */
  private async parseServerResponse(data: Buffer): Promise<StreamingAsrResult> {
    if (data.length < 4) {
      throw new Error('Invalid response: too short');
    }

    // 解析消息头
    const messageType = (data[1] >> 4) & 0x0f;
    const specificFlags = data[1] & 0x0f;
    const compression = data[2] & 0x0f;

    // 处理错误响应
    if (messageType === MESSAGE_TYPE.ERROR_RESPONSE) {
      if (data.length < 12) {
        throw new Error('Invalid error response: too short');
      }
      const errorCode = data.readUInt32BE(4);
      const errorSize = data.readUInt32BE(8);

      // 验证 errorSize 的合理性（不超过 1MB）
      if (errorSize > 1024 * 1024) {
        this.logError('Invalid error size in error response', {
          errorSize,
          dataLength: data.length,
          firstBytes: data.slice(0, 16).toString('hex'),
        });
        throw new Error(
          `Invalid error response: errorSize too large (${errorSize})`,
        );
      }

      if (data.length < 12 + errorSize) {
        throw new Error(
          `Incomplete error response: expected ${12 + errorSize} bytes, got ${data.length}`,
        );
      }

      const rawErrorMessage = data.slice(12, 12 + errorSize).toString('utf-8');

      // 使用友好的错误描述
      const friendlyMessage =
        ERROR_CODE_MESSAGES[errorCode] || `未知错误 (${errorCode})`;

      this.logError('Volcengine ASR error response received', {
        errorCode,
        rawErrorMessage,
        friendlyMessage,
      });

      return {
        text: '',
        isFinal: true,
        error: `火山引擎 ASR 错误 [${errorCode}]: ${friendlyMessage}。原始信息: ${rawErrorMessage}`,
        errorCode,
      };
    }

    // 验证消息类型
    if (messageType !== MESSAGE_TYPE.FULL_SERVER_RESPONSE) {
      this.logWarn('Unexpected message type', {
        messageType,
        expected: MESSAGE_TYPE.FULL_SERVER_RESPONSE,
        dataLength: data.length,
        firstBytes: data.slice(0, 16).toString('hex'),
      });
      throw new Error(`Unexpected message type: ${messageType}`);
    }

    // 根据 specificFlags 判断是否有 sequence 字段
    // 0b0001 (POSITIVE_SEQUENCE) 和 0b0011 (LAST_PACKET_WITH_SEQ) 包含 sequence
    // 0b0000 (NO_SEQUENCE) 和 0b0010 (LAST_PACKET_NO_SEQ) 不包含 sequence
    const hasSequence =
      specificFlags === MESSAGE_FLAGS.POSITIVE_SEQUENCE ||
      specificFlags === MESSAGE_FLAGS.LAST_PACKET_WITH_SEQ;

    // 从 header 之后开始解析（header 固定 4 bytes）
    let offset = 4;

    // 解析序列号（如果存在）
    let sequence: number | undefined;
    if (hasSequence) {
      // 验证数据长度：至少需要 8 字节（header 4 + sequence 4）
      if (data.length < offset + 4) {
        throw new Error(
          `Invalid response: expected at least ${offset + 4} bytes for sequence, got ${data.length}`,
        );
      }
      // 使用 readInt32BE 读取有符号整数（LAST_PACKET_WITH_SEQ 时 sequence 为负数）
      sequence = data.readInt32BE(offset);
      offset += 4;
    }

    // 解析 payload size（紧跟在 header 或 sequence 之后）
    if (data.length < offset + 4) {
      throw new Error(
        `Invalid response: expected at least ${offset + 4} bytes for payload size, got ${data.length}`,
      );
    }
    const payloadSize = data.readUInt32BE(offset);
    offset += 4;

    // 验证 payloadSize 的合理性（不超过 10MB，防止读取错误位置导致异常大的值）
    const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      this.logError('Invalid payload size', {
        payloadSize,
        dataLength: data.length,
        sequence,
        messageType,
        specificFlags,
        hasSequence,
        firstBytes: data.slice(0, 16).toString('hex'),
      });
      throw new Error(
        `Invalid payload size: ${payloadSize} bytes (max: ${MAX_PAYLOAD_SIZE}). ` +
          `This may indicate a parsing error or corrupted message.`,
      );
    }

    // 验证数据完整性：确保有足够的数据来读取 payload
    const expectedLength = offset + payloadSize;
    if (data.length < expectedLength) {
      this.logWarn('Incomplete message detected', {
        expectedLength,
        actualLength: data.length,
        payloadSize,
        sequence,
        specificFlags,
        hasSequence,
        firstBytes: data.slice(0, 16).toString('hex'),
      });
      throw new Error(
        `Incomplete message: expected ${expectedLength} bytes, got ${data.length}. ` +
          `This may indicate a fragmented WebSocket message.`,
      );
    }

    const payload = data.slice(offset, offset + payloadSize);

    // 解压 payload
    let jsonBuffer: Buffer;
    try {
      if (compression === COMPRESSION.GZIP) {
        jsonBuffer = await gunzipAsync(payload);
      } else {
        jsonBuffer = payload;
      }
    } catch (decompressError) {
      throw new Error(
        `Failed to decompress payload: ${(decompressError as Error).message}`,
      );
    }

    // 安全地解析 JSON
    let result: any;
    try {
      const jsonString = jsonBuffer.toString('utf-8');
      result = JSON.parse(jsonString);
    } catch (parseError) {
      // 提供更详细的错误信息，包括部分 JSON 内容
      const partialJson = jsonBuffer.toString('utf-8').substring(0, 100);
      throw new Error(
        `Failed to parse JSON: ${(parseError as Error).message}. ` +
          `Partial content: ${partialJson}...`,
      );
    }

    // 提取音频时长信息
    const audioDuration = result.audio_info?.duration;

    // 提取识别结果
    const text = result.result?.text || result.result?.[0]?.text || '';
    const rawUtterances =
      result.result?.utterances || result.result?.[0]?.utterances || [];

    // 格式化 utterances（说话人分离数据）
    const utterances: StreamingUtterance[] = rawUtterances.map(
      (u: any, index: number) => {
        // 解析分词信息
        const rawWords = u.words || [];
        const words: StreamingWord[] = rawWords.map((w: any) => ({
          text: w.text || '',
          startTime: w.start_time ?? w.startTime ?? 0,
          endTime: w.end_time ?? w.endTime ?? 0,
          blankDuration: w.blank_duration ?? w.blankDuration,
        }));

        return {
          speakerId:
            u.additions?.speaker ||
            u.speaker_id ||
            u.speakerId ||
            `speaker_${index}`,
          text: u.text || u.content || '',
          startTime: u.start_time ?? u.startTime ?? 0,
          endTime: u.end_time ?? u.endTime ?? 0,
          definite: u.definite ?? true,
          speechRate: u.additions?.speech_rate ?? u.speech_rate ?? undefined,
          volume: u.additions?.volume ?? u.volume ?? undefined,
          emotion: u.additions?.emotion ?? u.emotion ?? undefined,
          gender: u.additions?.gender ?? u.gender ?? undefined,
          language: u.additions?.language ?? u.language ?? undefined,
          words: words.length > 0 ? words : undefined,
        };
      },
    );

    // 判断是否为最终结果
    // specificFlags: 0b0010 (LAST_PACKET_NO_SEQ) 或 0b0011 (LAST_PACKET_WITH_SEQ) 表示最后一包
    const isFinal =
      specificFlags === MESSAGE_FLAGS.LAST_PACKET_NO_SEQ ||
      specificFlags === MESSAGE_FLAGS.LAST_PACKET_WITH_SEQ;

    return {
      text,
      isFinal,
      utterances,
      sequence: sequence ?? 0, // 如果没有 sequence，返回 0
      audioDuration,
    };
  }

  /**
   * 建立流式识别连接
   *
   * @description 建立 WebSocket 连接并发送初始配置请求
   *
   * @param params - 连接参数
   * @param callbacks - 事件回调
   * @returns 连接 ID
   */
  async connect(
    params: StreamingConnectParams,
    callbacks: StreamingAsrCallbacks,
  ): Promise<string> {
    const {
      sessionId,
      audioFormat = 'pcm',
      sampleRate = 16000,
      channels = 1,
      enableSpeakerInfo = true,
      // 新增参数
      language,
      enableItn = true,
      enablePunc = true,
      enableDdc = true,
      enableNonstream = true,
      showUtterances = true,
      showSpeechRate = true,
      showVolume = true,
      enableLid = true,
      enableEmotionDetection = true,
      enableGenderDetection = true,
      resultType = 'full',
      enableAccelerateText = false,
      accelerateScore,
      vadSegmentDuration,
      endWindowSize = 800,
      forceToSpeechTime,
      sensitiveWordsFilter,
      corpus,
    } = params;

    // 生成连接 ID
    const connectionId = uuidv4();

    // 验证配置
    if (!this.config.appId || !this.config.appAccessToken) {
      throw new Error('Volcengine config missing appId or appAccessToken');
    }

    if (!this.config.uid) {
      throw new Error('Volcengine config missing uid');
    }

    // 使用配置中的流式端点或默认端点
    const endpoint = this.config.endpoint;

    // 构建认证头
    const headers = this.buildHeaders(connectionId);

    this.logInfo('Creating WebSocket connection', {
      sessionId,
      connectionId,
      endpoint,
      audioFormat,
    });

    return new Promise((resolve, reject) => {
      // 创建 WebSocket 连接
      const ws = new WebSocket(endpoint, { headers });

      // 初始化连接信息
      const connectionInfo: ConnectionInfo = {
        ws,
        status: 'connecting',
        callbacks,
        sessionId,
        sequence: 0,
        transcript: '',
        utterances: [],
        connectParams: params,
        retryCount: 0,
        lastActivityTime: Date.now(),
        isReconnecting: false,
        pendingAudioBuffer: [],
      };

      this.connections.set(connectionId, connectionInfo);

      // 连接建立事件
      ws.on('open', async () => {
        try {
          this.logInfo('WebSocket connection opened', {
            connectionId,
          });

          // 发送初始请求（Full client request）
          const initRequest = this.buildInitRequest({
            audioFormat,
            sampleRate,
            channels,
            enableSpeakerInfo,
            language,
            enableItn,
            enablePunc,
            enableDdc,
            enableNonstream,
            showUtterances,
            showSpeechRate,
            showVolume,
            enableLid,
            enableEmotionDetection,
            enableGenderDetection,
            resultType,
            enableAccelerateText,
            accelerateScore,
            vadSegmentDuration,
            endWindowSize,
            forceToSpeechTime,
            sensitiveWordsFilter,
            corpus,
          });

          const message = await this.buildFullClientRequest(initRequest);
          ws.send(message);

          // 更新状态
          connectionInfo.status = 'connected';
          connectionInfo.retryCount = 0; // 重置重试计数
          connectionInfo.lastActivityTime = Date.now();

          // 启动心跳机制
          this.startHeartbeat(connectionId);

          callbacks.onConnected?.();

          resolve(connectionId);
        } catch (error) {
          this.logError('Failed to send init request', {
            connectionId,
            error: (error as Error).message,
          });
          connectionInfo.status = 'error';
          reject(error);
        }
      });

      // 消息接收事件
      ws.on('message', async (data: Buffer) => {
        try {
          // 更新最后活动时间
          connectionInfo.lastActivityTime = Date.now();

          // 重置心跳超时
          this.resetHeartbeatTimeout(connectionId);

          // 记录接收到的消息详细信息（用于调试协议解析问题）
          if (data.length > 0) {
            const messageType = data.length >= 2 ? (data[1] >> 4) & 0x0f : -1;
            const specificFlags = data.length >= 2 ? data[1] & 0x0f : -1;
            const compression = data.length >= 3 ? data[2] & 0x0f : -1;

            this.logDebug('Received WebSocket message', {
              connectionId,
              messageSize: data.length,
              messageType,
              specificFlags,
              compression,
              firstBytes: data
                .slice(0, Math.min(20, data.length))
                .toString('hex'),
            });
          }

          const result = await this.parseServerResponse(data);

          // 更新累积结果
          if (result.text) {
            connectionInfo.transcript = result.text;
          }
          if (result.utterances && result.utterances.length > 0) {
            connectionInfo.utterances = result.utterances;
          }

          // 触发回调
          callbacks.onResult?.(result);

          // 如果是最终结果，更新状态
          if (result.isFinal) {
            connectionInfo.status = 'completed';
            // 完成后停止心跳
            this.stopHeartbeat(connectionId);
          } else {
            connectionInfo.status = 'streaming';
          }
        } catch (error) {
          this.logError('Failed to parse server response', {
            connectionId,
            error: (error as Error).message,
          });
          callbacks.onError?.(error as Error);
        }
      });

      // 错误事件
      ws.on('error', (error) => {
        this.logError('WebSocket error', {
          connectionId,
          error: error.message,
        });
        connectionInfo.status = 'error';
        callbacks.onError?.(error);
        reject(error);
      });

      // 关闭事件
      ws.on('close', async (code, reason) => {
        this.logInfo('WebSocket connection closed', {
          connectionId,
          code,
          reason: reason.toString(),
        });

        // 停止心跳
        this.stopHeartbeat(connectionId);

        // 如果是异常关闭且未完成，尝试重连
        if (
          connectionInfo.status !== 'completed' &&
          connectionInfo.status !== 'disconnected' &&
          !connectionInfo.isReconnecting &&
          code !== 1000 // 正常关闭不重连
        ) {
          await this.attemptReconnect(connectionId);
        } else if (connectionInfo.status !== 'completed') {
          connectionInfo.status = 'disconnected';
          callbacks.onDisconnected?.();
        }
      });

      // 连接超时处理
      const timeout = setTimeout(() => {
        if (connectionInfo.status === 'connecting') {
          this.logError('WebSocket connection timeout', {
            connectionId,
          });
          ws.close();
          connectionInfo.status = 'error';
          reject(new Error('WebSocket connection timeout'));
        }
      }, 30000); // 30 秒超时

      // 连接成功后清除超时
      ws.on('open', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * 计算音频时长（毫秒）
   *
   * @description 根据音频数据大小和采样参数计算时长
   * @param audioBytes - 音频数据字节数
   * @param sampleRate - 采样率（默认 16000）
   * @param channels - 声道数（默认 1）
   * @param bitsPerSample - 采样位深（默认 16）
   * @returns 音频时长（毫秒）
   */
  private calculateAudioDurationMs(
    audioBytes: number,
    sampleRate: number = 16000,
    channels: number = 1,
    bitsPerSample: number = 16,
  ): number {
    const bytesPerSample = bitsPerSample / 8;
    const bytesPerSecond = sampleRate * channels * bytesPerSample;
    return (audioBytes / bytesPerSecond) * 1000;
  }

  /**
   * 发送音频数据
   *
   * @description 将音频数据分包发送到火山引擎服务
   * 文档建议单包音频大小 100-200ms，双向流式模式推荐 200ms
   *
   * @param connectionId - 连接 ID
   * @param audioData - 音频数据（Buffer）
   * @param isLast - 是否为最后一帧
   */
  async sendAudio(
    connectionId: string,
    audioData: Buffer,
    isLast: boolean = false,
  ): Promise<void> {
    const connectionInfo = this.connections.get(connectionId);

    if (!connectionInfo) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // 计算音频包时长并记录（仅对非空包进行检查）
    if (audioData.length > 0) {
      const { connectParams } = connectionInfo;
      const audioDurationMs = this.calculateAudioDurationMs(
        audioData.length,
        connectParams.sampleRate || 16000,
        connectParams.channels || 1,
      );

      // 如果音频包时长超出推荐范围，记录调试日志
      if (
        audioDurationMs < RECOMMENDED_AUDIO_PACKET_MS.MIN ||
        audioDurationMs > RECOMMENDED_AUDIO_PACKET_MS.MAX * 2
      ) {
        this.logDebug('Audio packet size outside recommended range', {
          connectionId,
          audioBytes: audioData.length,
          audioDurationMs: Math.round(audioDurationMs),
          recommendedMs: `${RECOMMENDED_AUDIO_PACKET_MS.MIN}-${RECOMMENDED_AUDIO_PACKET_MS.MAX}`,
          optimalMs: RECOMMENDED_AUDIO_PACKET_MS.OPTIMAL,
        });
      }
    }

    // 如果正在重连，将音频数据缓冲
    if (connectionInfo.isReconnecting) {
      this.bufferAudioDuringReconnect(connectionId, audioData);
      this.logInfo('Audio buffered during reconnect', {
        connectionId,
        bufferSize: connectionInfo.pendingAudioBuffer.length,
      });
      return;
    }

    // Allow resuming from 'completed' or 'disconnected' status
    // This handles the case where:
    // 1. The ASR provider marked the connection as completed due to receiving isFinal=true
    // 2. The WebSocket connection was disconnected (e.g., page refresh, network issue)
    // In both cases, we try to reactivate the connection
    if (
      connectionInfo.status !== 'connected' &&
      connectionInfo.status !== 'streaming' &&
      connectionInfo.status !== 'completed' &&
      connectionInfo.status !== 'disconnected'
    ) {
      throw new Error(`Invalid connection status: ${connectionInfo.status}`);
    }

    // If status is 'completed' or 'disconnected', try to reactivate
    if (
      connectionInfo.status === 'completed' ||
      connectionInfo.status === 'disconnected'
    ) {
      this.logInfo(`Reactivating ${connectionInfo.status} connection`, {
        connectionId,
      });

      // Check if WebSocket is still open
      if (connectionInfo.ws.readyState !== WebSocket.OPEN) {
        // WebSocket is closed, need to reconnect
        this.logWarn('WebSocket closed, attempting reconnect', {
          connectionId,
          readyState: connectionInfo.ws.readyState,
        });

        // Try to reconnect
        try {
          await this.attemptReconnect(connectionId);
          // After reconnect, check if the connection is now active
          // Note: attemptReconnect updates connectionInfo in the Map
          const updatedInfo = this.connections.get(connectionId);
          if (
            !updatedInfo ||
            (updatedInfo.status !== 'connected' &&
              updatedInfo.status !== 'streaming')
          ) {
            if (!isLast) {
              this.bufferAudioDuringReconnect(connectionId, audioData);
              return;
            }
            throw new Error('Failed to reconnect WebSocket');
          }
          // Reconnect succeeded, continue with the updated connection
        } catch (error) {
          // Reconnect failed
          if (!isLast) {
            this.bufferAudioDuringReconnect(connectionId, audioData);
            this.logError('Reconnect failed, audio buffered', {
              connectionId,
              error: error instanceof Error ? error.message : String(error),
            });
            return;
          }
          throw error;
        }
      } else {
        // WebSocket is still open, just update status
        connectionInfo.status = 'streaming';
      }
    }

    const { ws } = connectionInfo;

    if (ws.readyState !== WebSocket.OPEN) {
      // WebSocket 未打开，尝试缓冲数据
      if (!isLast) {
        this.bufferAudioDuringReconnect(connectionId, audioData);
        this.logWarn('WebSocket not open, audio buffered', {
          connectionId,
          readyState: ws.readyState,
        });
        return;
      }
      throw new Error('WebSocket is not open');
    }

    // 构建并发送音频数据包
    const message = await this.buildAudioOnlyRequest(audioData, isLast);
    ws.send(message);

    // 更新状态和最后活动时间
    connectionInfo.status = 'streaming';
    connectionInfo.lastActivityTime = Date.now();

    if (isLast) {
      this.logInfo('Sent last audio packet', { connectionId });
    }
  }

  /**
   * 关闭连接
   *
   * @param connectionId - 连接 ID
   */
  async disconnect(connectionId: string): Promise<void> {
    const connectionInfo = this.connections.get(connectionId);

    if (!connectionInfo) {
      this.logWarn('Connection not found for disconnect', {
        connectionId,
      });
      return;
    }

    // 停止心跳
    this.stopHeartbeat(connectionId);

    // 标记为已断开，防止重连
    connectionInfo.status = 'disconnected';
    connectionInfo.isReconnecting = false;

    const { ws } = connectionInfo;

    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Normal closure'); // 使用正常关闭码
    }

    this.connections.delete(connectionId);
    this.logInfo('Connection disconnected', { connectionId });
  }

  /**
   * 获取连接状态
   *
   * @param connectionId - 连接 ID
   * @returns 连接状态
   */
  getConnectionStatus(connectionId: string): StreamingAsrStatus {
    const connectionInfo = this.connections.get(connectionId);
    return connectionInfo?.status || 'disconnected';
  }

  /**
   * 获取累积的转写结果
   *
   * @param connectionId - 连接 ID
   * @returns 转写结果
   */
  getTranscript(connectionId: string): {
    transcript: string;
    utterances: StreamingUtterance[];
  } | null {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) {
      return null;
    }
    return {
      transcript: connectionInfo.transcript,
      utterances: connectionInfo.utterances,
    };
  }

  /**
   * 获取活跃连接数
   *
   * @returns 活跃连接数量
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 清理所有连接
   *
   * @description 关闭所有活跃的 WebSocket 连接
   */
  async cleanupAllConnections(): Promise<void> {
    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      await this.disconnect(connectionId);
    }
    this.logInfo('All connections cleaned up');
  }

  // =========================================================================
  // 心跳机制相关方法
  // =========================================================================

  /**
   * 启动心跳机制
   *
   * @description 定期发送心跳包以保持连接活跃
   * @param connectionId - 连接 ID
   */
  private startHeartbeat(connectionId: string): void {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    // 清除已有的心跳定时器
    this.stopHeartbeat(connectionId);

    // 设置新的心跳定时器
    connectionInfo.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat(connectionId);
    }, HEARTBEAT_CONFIG.interval);

    this.logInfo('Heartbeat started', { connectionId });
  }

  /**
   * 停止心跳机制
   *
   * @param connectionId - 连接 ID
   */
  private stopHeartbeat(connectionId: string): void {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    if (connectionInfo.heartbeatTimer) {
      clearInterval(connectionInfo.heartbeatTimer);
      connectionInfo.heartbeatTimer = undefined;
    }

    if (connectionInfo.heartbeatTimeoutTimer) {
      clearTimeout(connectionInfo.heartbeatTimeoutTimer);
      connectionInfo.heartbeatTimeoutTimer = undefined;
    }
  }

  /**
   * 发送心跳包
   *
   * @description 发送一个空的音频包作为心跳
   * @param connectionId - 连接 ID
   */
  private async sendHeartbeat(connectionId: string): Promise<void> {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    const { ws, status } = connectionInfo;

    if (status !== 'connected' && status !== 'streaming') {
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      this.logWarn('Cannot send heartbeat: WebSocket not open', {
        connectionId,
        readyState: ws.readyState,
      });
      return;
    }

    try {
      // 发送空音频包作为心跳
      const emptyAudio = Buffer.alloc(0);
      const message = await this.buildAudioOnlyRequest(emptyAudio, false);
      ws.send(message);

      // 设置心跳超时检测
      connectionInfo.heartbeatTimeoutTimer = setTimeout(() => {
        this.handleHeartbeatTimeout(connectionId);
      }, HEARTBEAT_CONFIG.timeout);

      this.logInfo('Heartbeat sent', { connectionId });
    } catch (error) {
      this.logError('Failed to send heartbeat', {
        connectionId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * 重置心跳超时
   *
   * @description 收到服务器响应时重置超时检测
   * @param connectionId - 连接 ID
   */
  private resetHeartbeatTimeout(connectionId: string): void {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    if (connectionInfo.heartbeatTimeoutTimer) {
      clearTimeout(connectionInfo.heartbeatTimeoutTimer);
      connectionInfo.heartbeatTimeoutTimer = undefined;
    }
  }

  /**
   * 处理心跳超时
   *
   * @description 心跳超时表示连接可能已断开，触发重连
   * @param connectionId - 连接 ID
   */
  private handleHeartbeatTimeout(connectionId: string): void {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    this.logWarn('Heartbeat timeout, connection may be dead', {
      connectionId,
    });

    // 标记状态为错误
    connectionInfo.status = 'error';

    // 关闭当前连接并触发重连
    const { ws } = connectionInfo;
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(4000, 'Heartbeat timeout');
    }
  }

  // =========================================================================
  // 重连机制相关方法
  // =========================================================================

  /**
   * 尝试重新连接
   *
   * @description 使用指数退避策略进行重连
   * @param connectionId - 连接 ID
   */
  private async attemptReconnect(connectionId: string): Promise<void> {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    // 检查重试次数
    if (connectionInfo.retryCount >= this.reconnectConfig.maxRetries) {
      this.logError('Max reconnect attempts reached', {
        connectionId,
        retryCount: connectionInfo.retryCount,
      });
      connectionInfo.status = 'disconnected';
      connectionInfo.callbacks.onError?.(
        new Error('Max reconnect attempts reached'),
      );
      connectionInfo.callbacks.onDisconnected?.();
      return;
    }

    connectionInfo.isReconnecting = true;
    connectionInfo.retryCount++;

    // 计算延迟时间（指数退避）
    const delay = Math.min(
      this.reconnectConfig.initialDelay *
        Math.pow(
          this.reconnectConfig.backoffMultiplier,
          connectionInfo.retryCount - 1,
        ),
      this.reconnectConfig.maxDelay,
    );

    this.logInfo('Attempting reconnect', {
      connectionId,
      retryCount: connectionInfo.retryCount,
      delayMs: delay,
    });

    // 等待延迟后重连
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 检查是否仍需要重连
    if (
      connectionInfo.status === 'completed' ||
      connectionInfo.status === 'disconnected'
    ) {
      this.logInfo('Reconnect cancelled: status changed', {
        connectionId,
        status: connectionInfo.status,
      });
      return;
    }

    try {
      // 创建新的 WebSocket 连接
      await this.reconnect(connectionId);
    } catch (error) {
      this.logError('Reconnect failed', {
        connectionId,
        error: (error as Error).message,
      });

      // 递归重试
      await this.attemptReconnect(connectionId);
    }
  }

  /**
   * 执行重连
   *
   * @description 创建新的 WebSocket 连接并恢复状态
   * @param connectionId - 连接 ID
   */
  private async reconnect(connectionId: string): Promise<void> {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) {
      throw new Error('Connection info not found');
    }

    const { connectParams, callbacks } = connectionInfo;

    // 使用配置中的流式端点或默认端点
    const endpoint = this.config.endpoint;
    const headers = this.buildHeaders(connectionId);

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(endpoint, { headers });

      // 连接建立事件
      ws.on('open', async () => {
        try {
          this.logInfo('Reconnected successfully', { connectionId });

          // 发送初始请求（使用保存的连接参数）
          const initRequest = this.buildInitRequest({
            audioFormat: connectParams.audioFormat || 'pcm',
            sampleRate: connectParams.sampleRate || 16000,
            channels: connectParams.channels || 1,
            enableSpeakerInfo: connectParams.enableSpeakerInfo !== false,
            language: connectParams.language,
            enableItn: connectParams.enableItn ?? true,
            enablePunc: connectParams.enablePunc ?? true,
            enableDdc: connectParams.enableDdc ?? true,
            enableNonstream: connectParams.enableNonstream ?? true,
            showUtterances: connectParams.showUtterances ?? true,
            showSpeechRate: connectParams.showSpeechRate ?? true,
            showVolume: connectParams.showVolume ?? true,
            enableLid: connectParams.enableLid ?? true,
            enableEmotionDetection:
              connectParams.enableEmotionDetection ?? true,
            enableGenderDetection: connectParams.enableGenderDetection ?? true,
            resultType: connectParams.resultType || 'full',
            enableAccelerateText: connectParams.enableAccelerateText ?? false,
            accelerateScore: connectParams.accelerateScore,
            vadSegmentDuration: connectParams.vadSegmentDuration,
            endWindowSize: connectParams.endWindowSize ?? 800,
            forceToSpeechTime: connectParams.forceToSpeechTime,
            sensitiveWordsFilter: connectParams.sensitiveWordsFilter,
            corpus: connectParams.corpus,
          });

          const message = await this.buildFullClientRequest(initRequest);
          ws.send(message);

          // 更新连接信息
          connectionInfo.ws = ws;
          connectionInfo.status = 'connected';
          connectionInfo.isReconnecting = false;
          connectionInfo.lastActivityTime = Date.now();

          // 重新启动心跳
          this.startHeartbeat(connectionId);

          // 发送缓冲的音频数据
          if (connectionInfo.pendingAudioBuffer.length > 0) {
            this.logInfo('Sending buffered audio data', {
              connectionId,
              bufferCount: connectionInfo.pendingAudioBuffer.length,
            });

            for (const buffer of connectionInfo.pendingAudioBuffer) {
              await this.sendAudio(connectionId, buffer, false);
            }
            connectionInfo.pendingAudioBuffer = [];
          }

          callbacks.onConnected?.();
          resolve();
        } catch (error) {
          this.logError('Failed to initialize reconnected session', {
            connectionId,
            error: (error as Error).message,
          });
          reject(error);
        }
      });

      // 消息接收事件
      ws.on('message', async (data: Buffer) => {
        try {
          connectionInfo.lastActivityTime = Date.now();
          this.resetHeartbeatTimeout(connectionId);

          const result = await this.parseServerResponse(data);

          if (result.text) {
            connectionInfo.transcript = result.text;
          }
          if (result.utterances && result.utterances.length > 0) {
            connectionInfo.utterances = result.utterances;
          }

          callbacks.onResult?.(result);

          if (result.isFinal) {
            connectionInfo.status = 'completed';
            this.stopHeartbeat(connectionId);
          } else {
            connectionInfo.status = 'streaming';
          }
        } catch (error) {
          this.logError('Failed to parse server response', {
            connectionId,
            error: (error as Error).message,
          });
          callbacks.onError?.(error as Error);
        }
      });

      // 错误事件
      ws.on('error', (error) => {
        this.logError('Reconnect WebSocket error', {
          connectionId,
          error: error.message,
        });
        reject(error);
      });

      // 关闭事件
      ws.on('close', async (code, reason) => {
        this.logInfo('Reconnected WebSocket closed', {
          connectionId,
          code,
          reason: reason.toString(),
        });

        this.stopHeartbeat(connectionId);

        if (
          connectionInfo.status !== 'completed' &&
          connectionInfo.status !== 'disconnected' &&
          code !== 1000
        ) {
          await this.attemptReconnect(connectionId);
        }
      });

      // 连接超时
      const timeout = setTimeout(() => {
        this.logError('Reconnect timeout', { connectionId });
        ws.close();
        reject(new Error('Reconnect timeout'));
      }, 15000);

      ws.on('open', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * 缓冲音频数据（用于重连期间）
   *
   * @description 在重连期间缓冲音频数据，重连成功后发送
   * @param connectionId - 连接 ID
   * @param audioData - 音频数据
   */
  bufferAudioDuringReconnect(connectionId: string, audioData: Buffer): void {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    // 限制缓冲区大小（最多 100 个包）
    if (connectionInfo.pendingAudioBuffer.length < 100) {
      connectionInfo.pendingAudioBuffer.push(audioData);
    } else {
      this.logWarn('Audio buffer full during reconnect', {
        connectionId,
      });
    }
  }

  /**
   * 检查连接是否正在重连
   *
   * @param connectionId - 连接 ID
   * @returns 是否正在重连
   */
  isReconnecting(connectionId: string): boolean {
    const connectionInfo = this.connections.get(connectionId);
    return connectionInfo?.isReconnecting ?? false;
  }
}
