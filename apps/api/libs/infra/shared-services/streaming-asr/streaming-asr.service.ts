/**
 * @fileoverview 流式语音识别服务
 *
 * 本服务提供流式语音识别的核心业务逻辑，包括：
 * - 创建和管理流式识别会话
 * - 音频数据传输
 * - 实时识别结果处理
 * - 与会议记录的集成
 *
 * @module streaming-asr/service
 */

import {
  Injectable,
  Inject,
  NotFoundException,
  OnModuleDestroy,
  forwardRef,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  VolcengineStreamingAsrProvider,
  VolcengineSaucConfig,
  StreamingAsrResult,
  StreamingAsrCallbacks,
} from '@app/clients/internal/openspeech';
import { getKeysConfig } from '@/config/configuration';
import { OpenSpeechConfig, JwtConfig } from '@/config/validation';
import { RedisService } from '@app/redis';
import enviroment from '@/utils/enviroment.util';
import {
  CreateStreamingSessionDto,
  StreamingSessionResult,
  StreamingTranscriptUpdate,
  CompleteStreamingSessionDto,
  CompleteStreamingSessionResult,
  SessionStatusResult,
  StreamingUtterance,
  StreamingAsrEvent,
  StreamingAsrEventType,
  StreamingSessionStatus,
  AudioBufferData,
} from './types';

/**
 * 会话超时配置
 */
const SESSION_TIMEOUT_CONFIG = {
  /** 会话最大活跃时间（4小时）
   * 会议录制时长限制：超过4小时将自动结束录制
   */
  maxSessionDuration: 4 * 60 * 60 * 1000,
  /** 会话空闲超时（60分钟）
   * 注意: 用户可能暂停录音较长时间,10分钟过短会导致数据丢失
   * 修改为 60 分钟以保护用户数据
   */
  idleTimeout: 60 * 60 * 1000,
  /** 清理检查间隔（1分钟） */
  cleanupInterval: 60 * 1000,
  /** 完成会话保留时间（30秒） */
  completedRetention: 30 * 1000,
  /** 时长警告阈值（3.5小时）
   * 当录制时长达到此阈值时，前端会显示警告
   */
  durationWarningThreshold: 3.5 * 60 * 60 * 1000,
};

/**
 * 会话信息
 */
interface SessionInfo {
  sessionId: string;
  connectionId: string;
  status: StreamingSessionStatus;
  meetingRecordId?: string;
  userId: string;
  transcript: string;
  utterances: StreamingUtterance[];
  audioDuration: number;
  createdAt: Date;
  /** 最后活动时间 */
  lastActivityAt: Date;
  error?: string;
  /** 音频缓冲区（用于保存音频） */
  audioBuffer?: AudioBufferData;
  /** Session Token (长期有效，4小时) */
  sessionToken?: string;
}

/**
 * 流式语音识别服务
 *
 * @description 提供流式语音识别的业务逻辑处理：
 *
 * 1. **创建会话** - `createSession`
 *    创建流式识别会话，建立 WebSocket 连接
 *
 * 2. **发送音频** - `sendAudio`
 *    发送音频数据到识别服务
 *
 * 3. **完成会话** - `completeSession`
 *    结束识别会话，获取最终结果
 *
 * 4. **查询状态** - `getSessionStatus`
 *    获取会话的实时状态和结果
 *
 * 5. **事件订阅** - `subscribeToSession`
 *    订阅实时识别结果事件
 *
 * @class StreamingAsrService
 *
 * @example
 * ```typescript
 * @Injectable()
 * class StreamingAsrController {
 *   constructor(private readonly streamingAsr: StreamingAsrService) {}
 *
 *   async startSession(dto: CreateStreamingSessionDto) {
 *     const result = await this.streamingAsr.createSession(dto);
 *     return result;
 *   }
 *
 *   async sendAudioChunk(connectionId: string, audioData: Buffer) {
 *     await this.streamingAsr.sendAudio(connectionId, audioData);
 *   }
 * }
 * ```
 */
@Injectable()
export class StreamingAsrService implements OnModuleDestroy {
  /**
   * 流式识别 Provider
   */
  private provider: VolcengineStreamingAsrProvider;

  /**
   * 会话信息存储
   * key: sessionId
   */
  private readonly sessions: Map<string, SessionInfo> = new Map();

  /**
   * connectionId -> sessionId 映射
   */
  private readonly connectionToSession: Map<string, string> = new Map();

  /**
   * 事件发射器（用于 SSE 推送）
   */
  private readonly eventEmitter: EventEmitter = new EventEmitter();

  /**
   * 会话超时清理定时器
   */
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    // 初始化 Provider
    this.initProvider();
    // 启动会话清理定时器
    this.startCleanupTimer();
  }

  /**
   * 模块销毁时清理资源
   */
  async onModuleDestroy(): Promise<void> {
    this.stopCleanupTimer();
    await this.cleanupAllSessions();
    if (enviroment.isProduction()) {
      this.logger.info('StreamingAsrService module destroyed');
    } else {
      this.logger.debug('StreamingAsrService module destroyed');
    }
  }

  /**
   * 初始化流式识别 Provider
   */
  private initProvider(): void {
    const openspeechConfig = getKeysConfig()?.openspeech as
      | OpenSpeechConfig
      | undefined;
    const tosConfig = openspeechConfig?.tos;

    if (!tosConfig || !tosConfig.sauc) {
      this.logger.warn(
        'Volcengine OpenSpeech SAUC config (tos.sauc) not found, streaming ASR will not be available',
      );
      return;
    }

    const config: VolcengineSaucConfig = {
      appId: tosConfig.appId,
      appAccessToken: tosConfig.appAccessToken,
      uid: tosConfig.uid,
      endpoint: tosConfig.sauc.endpoint,
      resourceId: tosConfig.sauc.resourceId,
      appAccessSecret: tosConfig.appAccessSecret,
      accessKey: tosConfig.accessKey,
      secretKey: tosConfig.secretKey,
    };

    this.provider = new VolcengineStreamingAsrProvider(this.logger, config);

    if (enviroment.isProduction()) {
      this.logger.info('StreamingAsrService module initialized');
    } else {
      this.logger.debug('StreamingAsrService module initialized');
    }
  }

  /**
   * 检查 Provider 是否可用
   */
  private ensureProviderAvailable(): void {
    if (!this.provider) {
      throw new Error(
        'Streaming ASR provider is not available. Please check configuration.',
      );
    }
  }

  /**
   * 创建流式识别会话
   *
   * @param {CreateStreamingSessionDto} dto - 创建会话参数
   * @returns {Promise<StreamingSessionResult>} 会话创建结果
   *
   * @example
   * ```typescript
   * const session = await streamingAsrService.createSession({
   *   userId: 'user-uuid',
   *   meetingRecordId: 'meeting-uuid', // 可选
   *   audioFormat: 'pcm',
   * });
   * console.log('Session ID:', session.sessionId);
   * console.log('Connection ID:', session.connectionId);
   * ```
   */
  async createSession(
    dto: CreateStreamingSessionDto,
  ): Promise<StreamingSessionResult> {
    this.ensureProviderAvailable();

    const sessionId = uuidv4();

    // 构建回调
    const callbacks: StreamingAsrCallbacks = {
      onConnected: () => {
        this.handleConnected(sessionId);
      },
      onResult: async (result: StreamingAsrResult) => {
        await this.handleResult(sessionId, result);
      },
      onError: (error: Error) => {
        this.handleError(sessionId, error);
      },
      onDisconnected: () => {
        this.handleDisconnected(sessionId);
      },
    };

    // 建立连接
    const connectionId = await this.provider.connect(
      {
        sessionId,
        audioFormat: dto.audioFormat || 'pcm',
        sampleRate: dto.sampleRate || 16000,
        channels: dto.channels || 1,
        enableSpeakerInfo: dto.enableSpeakerInfo !== false,
        corpus: dto.corpus,
      },
      callbacks,
    );

    // 创建会话信息
    const now = new Date();
    const sessionInfo: SessionInfo = {
      sessionId,
      connectionId,
      status: 'connected',
      meetingRecordId: dto.meetingRecordId,
      userId: dto.userId,
      transcript: '',
      utterances: [],
      audioDuration: 0,
      createdAt: now,
      lastActivityAt: now,
    };

    // 如果启用音频保存，初始化缓冲区
    if (dto.saveAudio) {
      sessionInfo.audioBuffer = {
        chunks: [],
        totalSize: 0,
        startTime: now,
        config: {
          enabled: true,
          format: dto.audioFormat || 'pcm',
          sampleRate: dto.sampleRate || 16000,
          channels: dto.channels || 1,
        },
      };
    }

    this.sessions.set(sessionId, sessionInfo);
    this.connectionToSession.set(connectionId, sessionId);

    // 如果关联了会议记录，更新会议状态
    if (dto.meetingRecordId) {
      try {
      } catch (error) {
        this.logger.warn('Failed to update meeting status', {
          meetingRecordId: dto.meetingRecordId,
          error: (error as Error).message,
        });
      }
    }

    this.logger.info('Streaming ASR session created', {
      sessionId,
      connectionId,
      meetingRecordId: dto.meetingRecordId,
    });

    // 生成长期有效的 session token (4小时)
    const sessionToken = await this.generateSessionToken(sessionId, dto.userId);

    // 存储 session token 到会话信息中
    sessionInfo.sessionToken = sessionToken;

    return {
      sessionId,
      connectionId,
      status: 'connected',
      meetingRecordId: dto.meetingRecordId,
      sessionToken, // 返回 session token
    };
  }

  /**
   * 发送音频数据
   *
   * @param {string} sessionIdOrConnectionId - 会话 ID 或连接 ID
   * @param {Buffer} audioData - 音频数据
   * @param {boolean} [isLast=false] - 是否为最后一帧
   *
   * @description
   * 此方法同时支持传入 sessionId 或 connectionId（向后兼容）：
   * - 优先作为 sessionId 查找（API 设计的主要方式，路径参数为 sessionId）
   * - 如果找不到，再尝试作为 connectionId 查找（向后兼容）
   *
   * @example
   * ```typescript
   * // 使用 sessionId 发送音频数据（推荐，符合 API 设计）
   * await streamingAsrService.sendAudio(sessionId, audioBuffer);
   *
   * // 使用 connectionId 发送音频数据（向后兼容）
   * await streamingAsrService.sendAudio(connectionId, audioBuffer);
   *
   * // 发送最后一帧
   * await streamingAsrService.sendAudio(sessionId, lastBuffer, true);
   * ```
   */
  async sendAudio(
    sessionIdOrConnectionId: string,
    audioData: Buffer,
    isLast: boolean = false,
  ): Promise<void> {
    this.ensureProviderAvailable();

    let sessionInfo: SessionInfo | undefined;
    let connectionId: string | undefined;

    // 优先作为 sessionId 查找（API 设计的主要方式）
    sessionInfo = this.sessions.get(sessionIdOrConnectionId);
    if (sessionInfo) {
      connectionId = sessionInfo.connectionId;
    } else {
      // 如果找不到，尝试作为 connectionId 查找（向后兼容）
      const sessionId = this.connectionToSession.get(sessionIdOrConnectionId);
      if (sessionId) {
        sessionInfo = this.sessions.get(sessionId);
        if (sessionInfo) {
          connectionId = sessionInfo.connectionId;
        }
      }
    }

    if (!sessionInfo || !connectionId) {
      this.logger.warn('Failed to find session for sendAudio', {
        sessionIdOrConnectionId,
        availableSessions: Array.from(this.sessions.keys()),
        availableConnections: Array.from(this.connectionToSession.keys()),
      });
      throw new NotFoundException(
        `Session or connection not found: ${sessionIdOrConnectionId}`,
      );
    }

    // 检查 Provider 连接状态，如果 disconnected 则尝试恢复
    const providerStatus = this.provider?.getConnectionStatus(connectionId);
    if (providerStatus === 'disconnected') {
      // Provider 报告 disconnected，但会话信息存在
      // 尝试通过 sendAudio 触发 Provider 的重连机制
      // Provider 的 sendAudio 方法会自动处理 disconnected 状态的重连
      this.logger.info(
        'Provider connection disconnected, attempting recovery via sendAudio',
        {
          sessionId: sessionInfo.sessionId,
          connectionId,
        },
      );
    }

    await this.provider.sendAudio(connectionId, audioData, isLast);

    // 更新最后活动时间
    sessionInfo.lastActivityAt = new Date();

    // ⚠️ P2: 更新 Redis 中的会话活动时间（用于服务重启后恢复）
    await this.saveSessionToRedis(sessionInfo).catch((error) => {
      // Redis 保存失败不影响主流程
      this.logger.warn('Failed to update session activity in Redis', {
        sessionId: sessionInfo.sessionId,
        error: (error as Error).message,
      });
    });

    // 估算音频时长（假设 16000Hz, 16bit, mono）
    // audioData.length / (16000 * 2) * 1000 = ms
    const estimatedDuration = (audioData.length / 32000) * 1000;
    sessionInfo.audioDuration += estimatedDuration;

    // 如果启用了音频保存，缓冲音频数据
    if (sessionInfo.audioBuffer) {
      sessionInfo.audioBuffer.chunks.push(audioData);
      sessionInfo.audioBuffer.totalSize += audioData.length;
    }
  }

  /**
   * 完成流式识别会话
   *
   * @param {CompleteStreamingSessionDto} dto - 完成会话参数
   * @returns {Promise<CompleteStreamingSessionResult>} 完成结果
   */
  async completeSession(
    dto: CompleteStreamingSessionDto,
  ): Promise<CompleteStreamingSessionResult> {
    const sessionInfo = this.sessions.get(dto.sessionId);
    if (!sessionInfo) {
      throw new NotFoundException(`Session not found: ${dto.sessionId}`);
    }

    // 获取最终结果
    const providerResult = this.provider.getTranscript(
      sessionInfo.connectionId,
    );
    if (providerResult) {
      sessionInfo.transcript = providerResult.transcript;
      sessionInfo.utterances = providerResult.utterances;
    }

    // 关闭连接
    await this.provider.disconnect(sessionInfo.connectionId);

    // 更新会话状态
    sessionInfo.status = 'completed';

    // 如果需要保存到会议记录
    if (dto.saveToMeeting !== false && sessionInfo.meetingRecordId) {
      try {
        this.logger.info('Transcript saved to meeting record', {
          sessionId: dto.sessionId,
          meetingRecordId: sessionInfo.meetingRecordId,
        });
      } catch (error) {
        this.logger.error('Failed to save transcript to meeting', {
          sessionId: dto.sessionId,
          meetingRecordId: sessionInfo.meetingRecordId,
          error: (error as Error).message,
        });
      }
    }

    // 发送完成事件
    this.emitEvent(dto.sessionId, {
      type: 'completed',
      sessionId: dto.sessionId,
      data: {
        sessionId: dto.sessionId,
        connectionId: sessionInfo.connectionId,
        text: sessionInfo.transcript,
        isFinal: true,
        utterances: sessionInfo.utterances,
      },
      timestamp: Date.now(),
    });

    // ⚠️ P2: 清理 Redis 中的会话数据（会话已完成，不再需要持久化）
    try {
      await this.redis.deleteData('streamingAsrSession', dto.sessionId);
    } catch (error) {
      this.logger.warn('Failed to delete completed session from Redis', {
        sessionId: dto.sessionId,
        error: (error as Error).message,
      });
    }

    // 清理会话（延迟，允许客户端获取最终结果）
    setTimeout(() => {
      this.cleanupSession(dto.sessionId);
    }, 30000); // 30 秒后清理

    // 合并音频缓冲区
    let audioBuffer: Buffer | undefined;
    let audioFormat:
      | { format: string; sampleRate: number; channels: number }
      | undefined;

    if (sessionInfo.audioBuffer && sessionInfo.audioBuffer.chunks.length > 0) {
      audioBuffer = Buffer.concat(sessionInfo.audioBuffer.chunks);
      audioFormat = {
        format: sessionInfo.audioBuffer.config.format,
        sampleRate: sessionInfo.audioBuffer.config.sampleRate,
        channels: sessionInfo.audioBuffer.config.channels,
      };
      this.logger.info('Audio buffer merged', {
        sessionId: dto.sessionId,
        totalSize: audioBuffer.length,
        chunksCount: sessionInfo.audioBuffer.chunks.length,
      });
    }

    this.logger.info('Streaming ASR session completed', {
      sessionId: dto.sessionId,
      transcriptLength: sessionInfo.transcript.length,
      utterancesCount: sessionInfo.utterances.length,
      audioDuration: sessionInfo.audioDuration,
      hasAudioBuffer: !!audioBuffer,
    });

    return {
      sessionId: dto.sessionId,
      finalTranscript: sessionInfo.transcript,
      finalUtterances: sessionInfo.utterances,
      audioDuration: Math.round(sessionInfo.audioDuration / 1000), // 转换为秒
      meetingRecordId: sessionInfo.meetingRecordId,
      audioBuffer,
      audioFormat,
    };
  }

  /**
   * 更新会话活动时间（心跳）
   *
   * @param {string} sessionId - 会话 ID
   * @returns {Promise<{ success: boolean; lastActivityAt: Date }>} 更新结果
   */
  async updateSessionActivity(sessionId: string): Promise<{
    success: boolean;
    lastActivityAt: Date;
  }> {
    const sessionInfo = this.sessions.get(sessionId);
    if (!sessionInfo) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    // 更新最后活动时间
    sessionInfo.lastActivityAt = new Date();

    // ⚠️ P2: 更新 Redis 中的会话活动时间（用于服务重启后恢复）
    await this.saveSessionToRedis(sessionInfo).catch((error) => {
      // Redis 保存失败不影响主流程
      this.logger.warn('Failed to update session activity in Redis', {
        sessionId,
        error: (error as Error).message,
      });
    });

    this.logger.debug('Session activity updated', {
      sessionId,
      lastActivityAt: sessionInfo.lastActivityAt,
    });

    return {
      success: true,
      lastActivityAt: sessionInfo.lastActivityAt,
    };
  }

  /**
   * 获取会话状态
   *
   * @param {string} sessionId - 会话 ID
   * @returns {SessionStatusResult} 会话状态
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatusResult> {
    let sessionInfo = this.sessions.get(sessionId);

    // ⚠️ P2: 如果内存中没有会话，尝试从 Redis 恢复
    if (!sessionInfo) {
      sessionInfo = await this.restoreSessionFromRedis(sessionId);
      if (sessionInfo) {
        // 恢复会话到内存
        this.sessions.set(sessionId, sessionInfo);
        this.connectionToSession.set(sessionInfo.connectionId, sessionId);
        this.logger.info('Session restored from Redis in getSessionStatus', {
          sessionId,
        });
      }
    }

    if (!sessionInfo) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    // 获取 Provider 最新状态
    const providerStatus = this.provider?.getConnectionStatus(
      sessionInfo.connectionId,
    );

    // ⚠️ 重要：不要直接覆盖状态，只在状态确实变化时才更新
    // 这样可以避免 WebSocket 短暂断开时，状态被错误地永久设置为 disconnected
    if (providerStatus) {
      // 只有在以下情况才更新状态：
      // 1. Provider 状态是 connected/streaming，且当前状态不是这些（允许恢复）
      // 2. Provider 状态是 completed/error，且当前状态不是这些（最终状态）
      // 3. 不要将 connected/streaming 覆盖为 disconnected（可能是临时断开）
      const isActiveStatus =
        providerStatus === 'connected' || providerStatus === 'streaming';
      const isFinalStatus =
        providerStatus === 'completed' || providerStatus === 'error';
      const currentIsActive =
        sessionInfo.status === 'connected' ||
        sessionInfo.status === 'streaming';

      if (
        (isActiveStatus && !currentIsActive) ||
        (isFinalStatus && sessionInfo.status !== providerStatus)
      ) {
        // 允许从 disconnected 恢复到 connected/streaming
        // 或更新为最终状态
        sessionInfo.status = providerStatus;
      } else if (providerStatus === 'disconnected' && currentIsActive) {
        // Provider 返回 disconnected，但当前状态是 active
        // 这可能是临时断开，不要覆盖状态，保持当前 active 状态
        this.logger.warn(
          'Provider reports disconnected but session is active, keeping active status',
          {
            sessionId,
            currentStatus: sessionInfo.status,
            providerStatus,
          },
        );
      }
    }

    // 获取最新转写结果
    const providerResult = this.provider?.getTranscript(
      sessionInfo.connectionId,
    );
    if (providerResult) {
      sessionInfo.transcript = providerResult.transcript;
      sessionInfo.utterances = providerResult.utterances;
    }

    return {
      sessionId,
      connectionId: sessionInfo.connectionId,
      status: sessionInfo.status,
      transcript: sessionInfo.transcript,
      utterances: sessionInfo.utterances,
      recognizedDuration: Math.round(sessionInfo.audioDuration / 1000),
      meetingRecordId: sessionInfo.meetingRecordId,
      error: sessionInfo.error,
    };
  }

  /**
   * 获取会话的 sessionToken
   * 如果不存在则重新生成
   *
   * @param {string} sessionId - 会话 ID
   * @returns {Promise<string>} sessionToken
   */
  async getSessionToken(sessionId: string): Promise<string> {
    const sessionInfo = this.sessions.get(sessionId);
    if (!sessionInfo) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    // 如果已有 sessionToken，直接返回
    if (sessionInfo.sessionToken) {
      return sessionInfo.sessionToken;
    }

    // 否则重新生成
    const sessionToken = await this.generateSessionToken(
      sessionId,
      sessionInfo.userId,
    );
    sessionInfo.sessionToken = sessionToken;
    return sessionToken;
  }

  /**
   * 取消/断开会话
   *
   * @param {string} sessionId - 会话 ID
   */
  async cancelSession(sessionId: string): Promise<void> {
    const sessionInfo = this.sessions.get(sessionId);
    if (!sessionInfo) {
      return;
    }

    await this.provider?.disconnect(sessionInfo.connectionId);
    sessionInfo.status = 'disconnected';

    // 发送断开事件
    this.emitEvent(sessionId, {
      type: 'disconnected',
      sessionId,
      timestamp: Date.now(),
    });

    this.cleanupSession(sessionId);

    this.logger.info('Streaming ASR session cancelled', { sessionId });
  }

  /**
   * 订阅会话事件（用于 SSE）
   *
   * @param {string} sessionId - 会话 ID
   * @param {function} callback - 事件回调
   * @returns {function} 取消订阅函数
   */
  subscribeToSession(
    sessionId: string,
    callback: (event: StreamingAsrEvent) => void,
  ): () => void {
    const eventName = `session:${sessionId}`;
    this.eventEmitter.on(eventName, callback);

    return () => {
      this.eventEmitter.off(eventName, callback);
    };
  }

  /**
   * 获取活跃会话数
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 根据 connectionId 获取 sessionId
   */
  getSessionIdByConnectionId(connectionId: string): string | undefined {
    return this.connectionToSession.get(connectionId);
  }

  // =========================================================================
  // 私有方法
  // =========================================================================

  /**
   * 处理连接建立事件
   */
  private handleConnected(sessionId: string): void {
    const sessionInfo = this.sessions.get(sessionId);
    if (sessionInfo) {
      sessionInfo.status = 'connected';
    }

    this.emitEvent(sessionId, {
      type: 'connected',
      sessionId,
      data: sessionInfo
        ? {
            sessionId,
            connectionId: sessionInfo.connectionId,
            text: sessionInfo.transcript || '',
            isFinal: false,
            utterances: sessionInfo.utterances,
          }
        : undefined,
      timestamp: Date.now(),
    });

    this.logger.info('Streaming ASR connected', { sessionId });
  }

  /**
   * 处理识别结果事件
   */
  private async handleResult(
    sessionId: string,
    result: StreamingAsrResult,
  ): Promise<void> {
    const sessionInfo = this.sessions.get(sessionId);
    if (!sessionInfo) {
      return;
    }

    // 更新会话数据
    if (result.text) {
      sessionInfo.transcript = result.text;
    }
    if (result.utterances && result.utterances.length > 0) {
      sessionInfo.utterances = result.utterances;
    }
    sessionInfo.status = result.isFinal ? 'completed' : 'streaming';
    sessionInfo.lastActivityAt = new Date();

    // ⚠️ P2: 更新 Redis 中的转写数据（用于服务重启后恢复）
    await this.saveSessionToRedis(sessionInfo).catch((error) => {
      // Redis 保存失败不影响主流程
      this.logger.warn('Failed to save session to Redis', {
        sessionId,
        error: (error as Error).message,
      });
    });

    // 发送实时更新事件
    this.emitEvent(sessionId, {
      type: 'transcript',
      sessionId,
      data: {
        sessionId,
        connectionId: sessionInfo.connectionId,
        text: result.text,
        isFinal: result.isFinal,
        utterances: result.utterances,
        sequence: result.sequence,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * 处理错误事件
   */
  private handleError(sessionId: string, error: Error): void {
    const sessionInfo = this.sessions.get(sessionId);
    if (sessionInfo) {
      sessionInfo.status = 'error';
      sessionInfo.error = error.message;
    }

    // 发送错误事件，确保包含所有必需字段以通过前端验证
    this.emitEvent(sessionId, {
      type: 'error',
      sessionId,
      data: {
        sessionId,
        connectionId: sessionInfo?.connectionId || '',
        text: sessionInfo?.transcript || '',
        isFinal: false,
        error: error.message,
        utterances: sessionInfo?.utterances || [],
      },
      timestamp: Date.now(),
    });

    this.logger.error('Streaming ASR error', {
      sessionId,
      connectionId: sessionInfo?.connectionId,
      error: error.message,
    });
  }

  /**
   * 处理断开连接事件
   */
  private handleDisconnected(sessionId: string): void {
    const sessionInfo = this.sessions.get(sessionId);
    if (sessionInfo && sessionInfo.status !== 'completed') {
      sessionInfo.status = 'disconnected';
    }

    this.emitEvent(sessionId, {
      type: 'disconnected',
      sessionId,
      data: sessionInfo
        ? {
            sessionId,
            connectionId: sessionInfo.connectionId,
            text: sessionInfo.transcript || '',
            isFinal: false,
            utterances: sessionInfo.utterances,
          }
        : undefined,
      timestamp: Date.now(),
    });

    this.logger.info('Streaming ASR disconnected', { sessionId });
  }

  /**
   * 发送事件
   */
  private emitEvent(sessionId: string, event: StreamingAsrEvent): void {
    const eventName = `session:${sessionId}`;
    this.eventEmitter.emit(eventName, event);
  }

  /**
   * 清理会话
   */
  private cleanupSession(sessionId: string): void {
    const sessionInfo = this.sessions.get(sessionId);
    if (sessionInfo) {
      this.connectionToSession.delete(sessionInfo.connectionId);
    }
    this.sessions.delete(sessionId);
    this.eventEmitter.removeAllListeners(`session:${sessionId}`);

    this.logger.info('Session cleaned up', { sessionId });
  }

  // =========================================================================
  // 会话超时清理相关方法
  // =========================================================================

  /**
   * 启动会话清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.checkAndCleanupSessions();
    }, SESSION_TIMEOUT_CONFIG.cleanupInterval);
    if (enviroment.isProduction()) {
      this.logger.info('Session cleanup timer started', {
        intervalMs: SESSION_TIMEOUT_CONFIG.cleanupInterval,
      });
    } else {
      this.logger.debug('Session cleanup timer started', {
        intervalMs: SESSION_TIMEOUT_CONFIG.cleanupInterval,
      });
    }
  }

  /**
   * 停止会话清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 检查并清理超时会话
   */
  private checkAndCleanupSessions(): void {
    const now = Date.now();
    const sessionsToCleanup: string[] = [];
    const sessionsToAutoComplete: Array<{
      sessionId: string;
      meetingId: string;
    }> = [];

    for (const [sessionId, sessionInfo] of this.sessions) {
      const createdAtMs = sessionInfo.createdAt.getTime();
      const lastActivityAtMs = sessionInfo.lastActivityAt.getTime();

      // 检查是否超过最大会话时长
      if (now - createdAtMs > SESSION_TIMEOUT_CONFIG.maxSessionDuration) {
        // 如果有 meetingRecordId，自动完成会议而不是清理
        if (sessionInfo.meetingRecordId) {
          this.logger.warn(
            'Session exceeded max duration, auto-completing meeting',
            {
              sessionId,
              meetingId: sessionInfo.meetingRecordId,
              durationMs: now - createdAtMs,
            },
          );
          sessionsToAutoComplete.push({
            sessionId,
            meetingId: sessionInfo.meetingRecordId,
          });
        } else {
          this.logger.warn('Session exceeded max duration, cleaning up', {
            sessionId,
            durationMs: now - createdAtMs,
          });
          sessionsToCleanup.push(sessionId);
        }
        continue;
      }

      // 检查是否空闲超时
      if (
        sessionInfo.status !== 'completed' &&
        now - lastActivityAtMs > SESSION_TIMEOUT_CONFIG.idleTimeout
      ) {
        this.logger.warn('Session idle timeout, cleaning up', {
          sessionId,
          idleMs: now - lastActivityAtMs,
        });
        sessionsToCleanup.push(sessionId);
        continue;
      }

      // 检查已完成会话是否超过保留时间
      if (
        sessionInfo.status === 'completed' &&
        now - lastActivityAtMs > SESSION_TIMEOUT_CONFIG.completedRetention
      ) {
        sessionsToCleanup.push(sessionId);
      }
    }

    // 自动完成超时的会议会话
    for (const { sessionId, meetingId } of sessionsToAutoComplete) {
      this.autoCompleteMeeting(sessionId, meetingId).catch((error) => {
        this.logger.error('Failed to auto-complete meeting', {
          sessionId,
          meetingId,
          error: (error as Error).message,
        });
        // 如果自动完成失败，回退到清理
        sessionsToCleanup.push(sessionId);
      });
    }

    // 执行清理
    for (const sessionId of sessionsToCleanup) {
      // ⚠️ P2: forceCleanupSession 现在是 async
      this.forceCleanupSession(sessionId).catch((error) => {
        this.logger.warn('Failed to cleanup session', {
          sessionId,
          error: (error as Error).message,
        });
      });
    }

    if (sessionsToCleanup.length > 0 || sessionsToAutoComplete.length > 0) {
      this.logger.info('Session cleanup completed', {
        cleanedCount: sessionsToCleanup.length,
        autoCompletedCount: sessionsToAutoComplete.length,
        remainingCount: this.sessions.size,
      });
    }
  }

  /**
   * 自动完成会议（超时时调用）
   * @private
   */
  private async autoCompleteMeeting(
    sessionId: string,
    meetingId: string,
  ): Promise<void> {
    try {
      this.logger.info('Auto-completing meeting due to duration limit', {
        sessionId,
        meetingId,
      });

      // 发送超时事件通知前端
      const sessionInfo = this.sessions.get(sessionId);
      const eventData: StreamingTranscriptUpdate & { message: string } = {
        sessionId,
        connectionId: sessionInfo?.connectionId || '',
        text: sessionInfo?.transcript || '',
        isFinal: false,
        utterances: sessionInfo?.utterances || [],
        message:
          'Recording duration has reached the 4-hour limit. Meeting will be automatically completed.',
      };
      // 发送超时事件通知前端
      // 注意：'duration-exceeded' 已在 types.ts 中添加到 StreamingAsrEventType
      // 使用双重类型断言以解决 TypeScript 类型缓存问题
      const event: StreamingAsrEvent = {
        type: 'duration-exceeded' as unknown as StreamingAsrEventType,
        sessionId,
        data: eventData,
        timestamp: Date.now(),
      };
      this.emitEvent(sessionId, event);

      this.logger.info('Meeting auto-completed successfully', {
        sessionId,
        meetingId,
      });
    } catch (error) {
      this.logger.error('Failed to auto-complete meeting', {
        sessionId,
        meetingId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * 保存会话数据到 Redis（用于服务重启后恢复）
   *
   * ⚠️ P2: Redis 持久化 - 保存转写数据，避免服务重启导致数据丢失
   */
  private async saveSessionToRedis(sessionInfo: SessionInfo): Promise<void> {
    try {
      const sessionData = {
        sessionId: sessionInfo.sessionId,
        connectionId: sessionInfo.connectionId,
        status: sessionInfo.status,
        meetingRecordId: sessionInfo.meetingRecordId,
        userId: sessionInfo.userId,
        transcript: sessionInfo.transcript,
        utterances: sessionInfo.utterances,
        audioDuration: sessionInfo.audioDuration,
        createdAt: sessionInfo.createdAt.toISOString(),
        lastActivityAt: sessionInfo.lastActivityAt.toISOString(),
        sessionToken: sessionInfo.sessionToken,
      };

      await this.redis.saveData(
        'streamingAsrSession',
        sessionInfo.sessionId,
        sessionData,
        7200, // 2小时（与会话最大时长一致）
      );

      this.logger.debug('Session saved to Redis', {
        sessionId: sessionInfo.sessionId,
      });
    } catch (error) {
      // Redis 保存失败不影响主流程，只记录警告
      this.logger.warn('Failed to save session to Redis', {
        sessionId: sessionInfo.sessionId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * 从 Redis 恢复会话数据（用于服务重启后恢复）
   *
   * ⚠️ P2: Redis 持久化 - 服务重启时恢复会话数据
   */
  private async restoreSessionFromRedis(
    sessionId: string,
  ): Promise<SessionInfo | null> {
    try {
      const sessionData = await this.redis.getData(
        'streamingAsrSession',
        sessionId,
      );

      if (!sessionData) {
        return null;
      }

      const sessionInfo: SessionInfo = {
        sessionId: sessionData.sessionId,
        connectionId: sessionData.connectionId,
        status: sessionData.status,
        meetingRecordId: sessionData.meetingRecordId,
        userId: sessionData.userId,
        transcript: sessionData.transcript || '',
        utterances: sessionData.utterances || [],
        audioDuration: sessionData.audioDuration || 0,
        createdAt: new Date(sessionData.createdAt),
        lastActivityAt: new Date(sessionData.lastActivityAt),
        sessionToken: sessionData.sessionToken,
      };

      this.logger.info('Session restored from Redis', {
        sessionId,
        status: sessionInfo.status,
      });

      return sessionInfo;
    } catch (error) {
      this.logger.warn('Failed to restore session from Redis', {
        sessionId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * 强制清理会话（用于超时清理）
   */
  private async forceCleanupSession(sessionId: string): Promise<void> {
    const sessionInfo = this.sessions.get(sessionId);

    // ⚠️ P2: 清理 Redis 中的会话数据
    try {
      await this.redis.deleteData('streamingAsrSession', sessionId);
    } catch (error) {
      this.logger.warn('Failed to delete session from Redis', {
        sessionId,
        error: (error as Error).message,
      });
    }

    if (!sessionInfo) return;

    // 如果会话仍在进行中，先断开连接
    if (
      sessionInfo.status !== 'completed' &&
      sessionInfo.status !== 'disconnected'
    ) {
      try {
        await this.provider?.disconnect(sessionInfo.connectionId);
      } catch (error) {
        this.logger.warn('Failed to disconnect during force cleanup', {
          sessionId,
          error: (error as Error).message,
        });
      }

      // 发送断开事件
      this.emitEvent(sessionId, {
        type: 'disconnected',
        sessionId,
        data: {
          sessionId,
          connectionId: sessionInfo.connectionId,
          text: sessionInfo.transcript || '',
          isFinal: false,
          error: 'Session timed out',
          utterances: sessionInfo.utterances,
        },
        timestamp: Date.now(),
      });
    }

    this.cleanupSession(sessionId);
  }

  /**
   * 清理所有会话
   */
  private async cleanupAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.forceCleanupSession(sessionId);
    }
    if (enviroment.isProduction()) {
      this.logger.info('StreamingAsrService all sessions cleaned up');
    } else {
      this.logger.debug('StreamingAsrService all sessions cleaned up');
    }
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(): {
    activeCount: number;
    streamingCount: number;
    completedCount: number;
    errorCount: number;
  } {
    let streamingCount = 0;
    let completedCount = 0;
    let errorCount = 0;

    for (const sessionInfo of this.sessions.values()) {
      switch (sessionInfo.status) {
        case 'streaming':
          streamingCount++;
          break;
        case 'completed':
          completedCount++;
          break;
        case 'error':
          errorCount++;
          break;
      }
    }

    return {
      activeCount: this.sessions.size,
      streamingCount,
      completedCount,
      errorCount,
    };
  }

  /**
   * 生成 session token
   *
   * @description
   * 生成长期有效的 session token (4小时)，用于音频发送认证
   * 解决 JWT token refresh 导致的音频数据丢失问题
   *
   * @param sessionId - Session ID
   * @param userId - User ID
   * @returns Session token
   */
  private async generateSessionToken(
    sessionId: string,
    userId: string,
  ): Promise<string> {
    const jwtConfig = this.config.getOrThrow<JwtConfig>('jwt');

    return await this.jwt.signAsync(
      {
        sessionId,
        userId,
        type: 'streaming-asr-session',
      },
      {
        secret: jwtConfig.secret,
        expiresIn: '4h', // 4小时，比 session 最大时长(2小时)长
      },
    );
  }
}
