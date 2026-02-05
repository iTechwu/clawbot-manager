import { Injectable, Inject, MessageEvent } from '@nestjs/common';
import { Subject, Observable, filter, map } from 'rxjs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * SSE 事件结构
 */
interface SseEvent {
  userId: string;
  type: string;
  data: Record<string, unknown>;
}

/**
 * Bot SSE 推送服务
 * 用于实时推送 Bot 状态变化给前端
 */
@Injectable()
export class BotSseService {
  private eventSubject = new Subject<SseEvent>();
  private connectionCount = 0;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 发送事件给指定用户
   */
  sendToUser(userId: string, type: string, data: Record<string, unknown>) {
    this.eventSubject.next({ userId, type, data });
    this.logger.debug('SSE event sent to user', { userId, type });
  }

  /**
   * 广播事件给所有用户
   */
  broadcast(type: string, data: Record<string, unknown>) {
    this.eventSubject.next({ userId: '*', type, data });
    this.logger.debug('SSE event broadcasted', { type });
  }

  /**
   * 获取用户的事件流
   * 用于 SSE 端点
   */
  getUserStream(userId: string): Observable<MessageEvent> {
    this.connectionCount++;
    this.logger.info('SSE connection opened', {
      userId,
      totalConnections: this.connectionCount,
    });

    return new Observable<MessageEvent>((subscriber) => {
      // 发送初始连接成功消息
      subscriber.next({
        data: JSON.stringify({
          type: 'connected',
          message: 'SSE connection established',
          timestamp: new Date().toISOString(),
        }),
      });

      const subscription = this.eventSubject
        .pipe(
          filter((event) => event.userId === userId || event.userId === '*'),
          map((event) => ({
            data: JSON.stringify({
              type: event.type,
              ...event.data,
            }),
          })),
        )
        .subscribe({
          next: (message) => subscriber.next(message),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });

      // 清理函数
      return () => {
        subscription.unsubscribe();
        this.connectionCount--;
        this.logger.info('SSE connection closed', {
          userId,
          totalConnections: this.connectionCount,
        });
      };
    });
  }

  /**
   * 获取当前连接数
   */
  getConnectionCount(): number {
    return this.connectionCount;
  }

  /**
   * 发送心跳消息
   * 用于保持连接活跃
   */
  sendHeartbeat(userId: string) {
    this.sendToUser(userId, 'heartbeat', {
      timestamp: new Date().toISOString(),
    });
  }
}
