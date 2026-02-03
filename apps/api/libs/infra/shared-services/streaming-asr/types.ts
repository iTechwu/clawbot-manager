/**
 * @fileoverview 流式语音识别服务类型定义
 *
 * @module streaming-asr/types
 */

import { StreamingAsrStatus as ProviderStatus } from '@app/clients/internal/openspeech';

/**
 * 流式识别会话状态
 */
export type StreamingSessionStatus = ProviderStatus;

/**
 * 创建流式识别会话参数
 */
export interface CreateStreamingSessionDto {
  /** 关联的会议记录 ID（可选） */
  meetingRecordId?: string;
  /** 创建人 ID */
  userId: string;
  /** 音频格式（默认 pcm） */
  audioFormat?: 'pcm' | 'wav' | 'ogg' | 'opus';
  /** 采样率（默认 16000） */
  sampleRate?: number;
  /** 声道数（默认 1） */
  channels?: number;
  /** 是否启用说话人分离（默认 true） */
  enableSpeakerInfo?: boolean;
  /** 是否保存音频数据（默认 false） */
  saveAudio?: boolean;
  /** 热词配置 */
  corpus?: {
    hotwords?: Array<{ word: string; factor: number }>;
  };
}

/**
 * 流式识别会话创建结果
 */
export interface StreamingSessionResult {
  /** 会话 ID */
  sessionId: string;
  /** 连接 ID（用于发送音频） */
  connectionId: string;
  /** 会话状态 */
  status: StreamingSessionStatus;
  /** 关联的会议记录 ID */
  meetingRecordId?: string;
  /**  */
  sessionToken?: string;
}

/**
 * 流式识别实时结果
 */
export interface StreamingTranscriptUpdate {
  /** 会话 ID */
  sessionId: string;
  /** 连接 ID */
  connectionId: string;
  /** 识别文本 */
  text: string;
  /** 是否为最终结果 */
  isFinal: boolean;
  /** 说话人分离数据 */
  utterances?: StreamingUtterance[];
  /** 序列号 */
  sequence?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 说话人分离片段
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
}

/**
 * 完成流式识别会话参数
 */
export interface CompleteStreamingSessionDto {
  /** 会话 ID */
  sessionId: string;
  /** 是否保存到会议记录（如果有关联） */
  saveToMeeting?: boolean;
}

/**
 * 完成流式识别会话结果
 */
export interface CompleteStreamingSessionResult {
  /** 会话 ID */
  sessionId: string;
  /** 最终转写文本 */
  finalTranscript: string;
  /** 说话人分离数据 */
  finalUtterances: StreamingUtterance[];
  /** 音频时长（秒） */
  audioDuration: number;
  /** 关联的会议记录 ID */
  meetingRecordId?: string;
  /** 音频数据（如果启用了保存） */
  audioBuffer?: Buffer;
  /** 音频格式信息 */
  audioFormat?: {
    format: string;
    sampleRate: number;
    channels: number;
  };
}

/**
 * 会话状态查询结果
 */
export interface SessionStatusResult {
  /** 会话 ID */
  sessionId: string;
  /** 连接 ID */
  connectionId: string;
  /** 会话状态 */
  status: StreamingSessionStatus;
  /** 当前转写文本 */
  transcript: string;
  /** 当前说话人分离数据 */
  utterances: StreamingUtterance[];
  /** 已识别音频时长（秒） */
  recognizedDuration: number;
  /** 关联的会议记录 ID */
  meetingRecordId?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * SSE 事件类型
 */
export type StreamingAsrEventType =
  | 'connected'
  | 'transcript'
  | 'error'
  | 'completed'
  | 'disconnected'
  | 'duration-exceeded';

/**
 * SSE 事件数据
 */
export interface StreamingAsrEvent {
  /** 事件类型 */
  type: StreamingAsrEventType;
  /** 会话 ID */
  sessionId: string;
  /** 事件数据 */
  data?:
    | StreamingTranscriptUpdate
    | { error: string }
    | (StreamingTranscriptUpdate & { message?: string });
  /** 时间戳 */
  timestamp: number;
}

/**
 * 音频缓冲区配置
 */
export interface AudioBufferConfig {
  /** 是否启用音频保存 */
  enabled: boolean;
  /** 音频格式 */
  format: string;
  /** 采样率 */
  sampleRate: number;
  /** 声道数 */
  channels: number;
}

/**
 * 音频缓冲区数据
 */
export interface AudioBufferData {
  /** 音频块列表 */
  chunks: Buffer[];
  /** 总大小（字节） */
  totalSize: number;
  /** 开始时间 */
  startTime: Date;
  /** 配置信息 */
  config: AudioBufferConfig;
}
