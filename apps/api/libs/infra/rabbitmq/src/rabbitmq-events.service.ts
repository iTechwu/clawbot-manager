/**
 * RabbitMQ Events Service
 *
 * 使用独立的 RabbitMQ 连接发布事件
 * 不影响其他任务队列
 */
import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import type { Connection, Channel } from 'amqplib';
import {
  RABBITMQ_EVENTS_CONNECTION,
  type RabbitmqEventsConnection,
} from './rabbitmq-events.module';

@Injectable()
export class RabbitmqEventsService implements OnModuleDestroy {
  private channel: Channel | null = null;
  private isInitialized = false;

  constructor(
    @Inject(RABBITMQ_EVENTS_CONNECTION)
    private readonly rabbitmqConnection: RabbitmqEventsConnection,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.initializeChannel();
  }

  /**
   * 初始化 Channel
   */
  private async initializeChannel(): Promise<void> {
    if (this.isInitialized || !this.rabbitmqConnection.connection) {
      return;
    }

    try {
      this.channel = await this.rabbitmqConnection.connection.createChannel();
      this.isInitialized = true;

      this.logger.info('[Events] RabbitMQ Events channel initialized');
    } catch (error) {
      this.logger.error(
        '[Events] Failed to initialize RabbitMQ Events channel',
        { error },
      );
    }
  }

  /**
   * 确保 Channel 已初始化
   */
  private async ensureChannel(): Promise<Channel | null> {
    if (!this.channel && !this.isInitialized) {
      await this.initializeChannel();
    }
    return this.channel;
  }

  /**
   * 发送消息到 RabbitMQ 队列
   */
  async sendMessageToQueue<T = any>(
    queue: string,
    message: T,
  ): Promise<boolean> {
    const channel = await this.ensureChannel();

    if (!channel) {
      this.logger.warn(
        '[Events] RabbitMQ Events channel not available, message not sent',
        { queue },
      );
      return false;
    }

    try {
      // 确保队列存在
      await channel.assertQueue(queue, {
        durable: true, // 队列持久化
      });

      // 发送消息
      const sent = channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true, // 消息持久化
          contentType: 'application/json',
        },
      );

      if (sent) {
        this.logger.debug('[Events] Message sent to queue', {
          queue,
          messageType: typeof message,
        });
      } else {
        this.logger.warn('[Events] Failed to send message to queue', {
          queue,
        });
      }

      return sent;
    } catch (error) {
      this.logger.error('[Events] Error sending message to queue', {
        error,
        queue,
      });
      return false;
    }
  }

  /**
   * 发布消息到 Exchange
   */
  async publishToExchange<T = any>(
    exchange: string,
    routingKey: string,
    message: T,
    exchangeType: 'direct' | 'topic' | 'fanout' | 'headers' = 'topic',
  ): Promise<boolean> {
    const channel = await this.ensureChannel();

    if (!channel) {
      this.logger.warn(
        '[Events] RabbitMQ Events channel not available, message not published',
        { exchange, routingKey },
      );
      return false;
    }

    try {
      // 确保 Exchange 存在
      await channel.assertExchange(exchange, exchangeType, {
        durable: true,
      });

      // 发布消息
      const published = channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: 'application/json',
        },
      );

      if (published) {
        this.logger.debug('[Events] Message published to exchange', {
          exchange,
          routingKey,
          messageType: typeof message,
        });
      } else {
        this.logger.warn('[Events] Failed to publish message to exchange', {
          exchange,
          routingKey,
        });
      }

      return published;
    } catch (error) {
      this.logger.error('[Events] Error publishing message to exchange', {
        error,
        exchange,
        routingKey,
      });
      return false;
    }
  }

  /**
   * 模块销毁时关闭连接
   */
  async onModuleDestroy() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.logger.info('[Events] RabbitMQ Events channel closed');
      }

      await this.rabbitmqConnection.close();
      this.logger.info('[Events] RabbitMQ Events connection closed');
    } catch (error) {
      this.logger.error('[Events] Error closing RabbitMQ Events connection', {
        error,
      });
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.isInitialized && this.channel !== null;
  }
}
