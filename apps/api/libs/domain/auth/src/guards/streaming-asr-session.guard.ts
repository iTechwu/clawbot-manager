/**
 * @fileoverview Streaming ASR Session Guard
 *
 * 专用于流式语音识别的 Session Token 验证守卫
 *
 * 解决问题：
 * - 长时间录音场景下，JWT token refresh 导致音频数据丢失
 * - 每次音频发送都需要验证 JWT token，性能开销大
 *
 * 方案：
 * - 创建会话时生成长期有效的 session token (4小时)
 * - 音频发送使用 session token 而不是 JWT token
 * - Session token 与 session 生命周期绑定
 *
 * @module auth/guards/streaming-asr-session
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import { apiError } from '@/filter/exception/api.exception';
import { ApiErrorCode, CommonErrorCode } from '@repo/contracts/errors';
import { StreamingAsrService } from '@app/shared-services/streaming-asr';
import type { JwtConfig } from '@/config/validation';

/**
 * Session Token Payload
 */
interface SessionTokenPayload {
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Token 类型标识 */
  type: 'streaming-asr-session';
  /** 签发时间 */
  iat: number;
  /** 过期时间 */
  exp: number;
}

/**
 * Streaming ASR Session Guard
 *
 * @description
 * 验证流式语音识别的 session token，确保：
 * 1. Token 有效且未过期
 * 2. Token 类型为 streaming-asr-session
 * 3. Session 存在且状态有效
 * 4. 将用户信息注入到 request 中
 *
 * @example
 * ```typescript
 * @UseGuards(StreamingAsrSessionGuard)
 * @Post('/streaming-asr/sessions/:sessionId/audio')
 * async sendAudioChunk(@Req() req: any) {
 *   // req.userId, req.sessionId 已注入
 * }
 * ```
 */
@Injectable()
export class StreamingAsrSessionGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => StreamingAsrService))
    private readonly streamingAsrService: StreamingAsrService,
  ) {}

  /**
   * 验证 session token
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // 1. 提取 session token
    const sessionToken = this.extractSessionToken(request);
    if (!sessionToken) {
      throw apiError(CommonErrorCode.UnAuthorized, {
        message: 'Session token is required',
      });
    }

    // 2. 验证 token 签名和有效期
    let payload: SessionTokenPayload;
    try {
      const jwtConfig = this.config.getOrThrow<JwtConfig>('jwt');
      payload = await this.jwt.verifyAsync<SessionTokenPayload>(sessionToken, {
        secret: jwtConfig.secret,
      });
    } catch (error) {
      throw apiError(CommonErrorCode.UnAuthorized, {
        message: 'Invalid or expired session token',
      });
    }

    // 3. 验证 token 类型
    if (payload.type !== 'streaming-asr-session') {
      throw apiError(CommonErrorCode.UnAuthorized, {
        message: 'Invalid token type',
      });
    }

    // 4. 验证 session 是否存在且有效
    try {
      const session = await this.streamingAsrService.getSessionStatus(
        payload.sessionId,
      );

      // Session 不存在或已失效
      if (!session) {
        throw apiError(CommonErrorCode.SessionExpired as ApiErrorCode, {
          message: 'Session not found',
        });
      }

      // ⚠️ 重要：允许 disconnected 状态继续，因为：
      // 1. Provider 的 sendAudio 方法会自动处理 disconnected 状态的重连
      // 2. 可能是 WebSocket 短暂断开，不应该立即拒绝请求
      // 3. 只有在明确错误状态时才拒绝
      if (session.status === 'error') {
        throw apiError(CommonErrorCode.SessionExpired as ApiErrorCode, {
          message: 'Session has encountered an error',
        });
      }

      // disconnected 状态允许继续，让 sendAudio 尝试恢复连接
      // completed 状态也允许继续（可能用户还在发送数据）
    } catch (error) {
      // Session 不存在
      if ((error as any).status === 404) {
        throw apiError(CommonErrorCode.SessionExpired as ApiErrorCode, {
          message: 'Session not found',
        });
      }
      throw error;
    }

    // 5. 注入用户信息到 request
    (request as any).userId = payload.userId;
    (request as any).sessionId = payload.sessionId;

    return true;
  }

  /**
   * 从 request 中提取 session token
   *
   * 支持两种方式：
   * 1. Header: X-Session-Token
   * 2. Query: session_token (用于 SSE)
   */
  private extractSessionToken(request: FastifyRequest): string | null {
    // 优先从 header 获取
    const headerToken = request.headers['x-session-token'] as
      | string
      | undefined;
    if (headerToken) {
      return headerToken;
    }

    // 从 query 获取（用于 SSE）
    const queryToken = (request.query as any)?.session_token as
      | string
      | undefined;
    if (queryToken) {
      return decodeURIComponent(queryToken);
    }

    return null;
  }
}
