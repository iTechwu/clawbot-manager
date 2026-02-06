/**
 * OpenClaw 客户端
 *
 * 职责：
 * - 与 OpenClaw Gateway 通信
 * - 发送消息到 OpenClaw 并获取 AI 响应
 * - 使用 WebSocket 进行实时通信
 */
import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';

export interface OpenClawMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenClawChatRequest {
  messages: OpenClawMessage[];
  stream?: boolean;
  model?: string;
}

export interface OpenClawChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenClawClient {
  private readonly requestTimeout = 120000; // 2 分钟超时
  private readonly wsTimeout = 120000; // WebSocket 响应超时

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 发送消息到 OpenClaw Gateway 并获取 AI 响应
   * 使用 WebSocket 进行通信
   * @param port OpenClaw Gateway 端口
   * @param token Gateway 认证 token
   * @param message 用户消息
   * @param context 可选的上下文消息
   */
  async chat(
    port: number,
    token: string,
    message: string,
    context?: OpenClawMessage[],
  ): Promise<string> {
    this.logger.info('OpenClawClient: 发送消息到 OpenClaw', {
      port,
      messageLength: message.length,
      contextLength: context?.length || 0,
    });

    try {
      const response = await this.sendMessageViaWebSocket(
        port,
        token,
        message,
        context,
      );

      this.logger.info('OpenClawClient: 收到 AI 响应', {
        port,
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      this.logger.error('OpenClawClient: 通信失败', {
        port,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 通过 WebSocket 发送消息并获取响应
   */
  private sendMessageViaWebSocket(
    port: number,
    token: string,
    message: string,
    context?: OpenClawMessage[],
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:${port}/chat?session=main&token=${encodeURIComponent(token)}`;

      this.logger.info('OpenClawClient: 建立 WebSocket 连接', {
        port,
        url: wsUrl.replace(token, '***'),
      });

      const ws = new WebSocket(wsUrl);
      let responseText = '';
      let isResolved = false;

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          ws.close();
          reject(new Error('WebSocket 响应超时'));
        }
      }, this.wsTimeout);

      ws.on('open', () => {
        this.logger.debug('OpenClawClient: WebSocket 连接已建立', { port });

        // 发送消息
        const payload = {
          type: 'message',
          content: message,
          context: context || [],
        };
        ws.send(JSON.stringify(payload));
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'response' || msg.type === 'assistant') {
            responseText += msg.content || '';
          } else if (msg.type === 'done' || msg.type === 'end') {
            // 响应完成
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeoutId);
              ws.close();
              resolve(responseText || msg.content || '');
            }
          } else if (msg.type === 'error') {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeoutId);
              ws.close();
              reject(new Error(msg.message || msg.error || 'Unknown error'));
            }
          }
        } catch {
          // 非 JSON 消息，可能是纯文本响应
          responseText += data.toString();
        }
      });

      ws.on('error', (error: Error) => {
        this.logger.error('OpenClawClient: WebSocket 错误', {
          port,
          error: error.message,
        });
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      ws.on('close', (code: number, reason: Buffer) => {
        this.logger.debug('OpenClawClient: WebSocket 连接关闭', {
          port,
          code,
          reason: reason.toString(),
        });

        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);

          // 如果有响应文本，返回它
          if (responseText) {
            resolve(responseText);
          } else if (code === 1008) {
            // 1008 = Policy Violation (unauthorized)
            reject(
              new Error(
                `WebSocket 认证失败: ${reason.toString() || 'gateway token missing'}`,
              ),
            );
          } else {
            reject(
              new Error(
                `WebSocket 连接意外关闭: code=${code}, reason=${reason.toString()}`,
              ),
            );
          }
        }
      });
    });
  }

  /**
   * 检查 OpenClaw Gateway 健康状态
   */
  async checkHealth(port: number): Promise<boolean> {
    const url = `http://localhost:${port}/health`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url).pipe(
          timeout(5000),
          catchError(() => {
            return Promise.resolve({ status: 500 });
          }),
        ),
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
